"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { getInterview } from "@/app/actions/interview";
import { submitAnswer, generateFollowUpQuestion, updateVideoUrl } from "@/app/actions/answer";
import { createRecordingSession, type RecordingSession } from "@/lib/mediaRecorder";
import { uploadVideoBlob } from "@/lib/videoUpload";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader, Mic, Volume2, SkipForward } from "lucide-react";
import Webcam from "react-webcam";
import { getStoredVoiceGender, selectVoice, loadVoices } from "@/lib/voiceUtils";
import { useTranslation } from "@/lib/i18n/LanguageContext";

interface QuestionAnswer {
  question: string;
  answer: string;
}

export default function StartInterviewPage() {
  const params = useParams<{ interviewId: string }>();
  const router = useRouter();
  const { t, language } = useTranslation();

  const [questions, setQuestions] = useState<QuestionAnswer[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [loading, setLoading] = useState(false);
  const [recognition, setRecognition] = useState<SpeechRecognition | null>(
    null
  );
  const [speechSupported, setSpeechSupported] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [followUpQuestion, setFollowUpQuestion] = useState<string | null>(null);
  const [isFollowUpMode, setIsFollowUpMode] = useState(false);
  const [loadingFollowUp, setLoadingFollowUp] = useState(false);
  const [parentAnswerId, setParentAnswerId] = useState<number | null>(null);
  const [difficulty, setDifficulty] = useState<string>("mid");

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const isRecordingRef = useRef(false);
  const countdownTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const webcamRef = useRef<Webcam>(null);
  const recordingSessionRef = useRef<RecordingSession | null>(null);
  const audioTrackRef = useRef<MediaStreamTrack | null>(null);

  useEffect(() => {
    if (params.interviewId) {
      getInterview(params.interviewId)
        .then((data) => {
          if (data?.jsonMockResp) {
            const parsed = JSON.parse(data.jsonMockResp);
            const arr = Array.isArray(parsed)
              ? parsed
              : Object.values(parsed).find(Array.isArray) || [];
            setQuestions(arr);
            setDifficulty(data.difficulty || "mid");
          }
        })
        .catch((err) => console.error("Failed to load interview:", err));
    }
  }, [params.interviewId]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        const rec = new SpeechRecognition();
        rec.continuous = true;
        rec.interimResults = false;
        rec.lang = language === "ko" ? "ko-KR" : "en-US";
        rec.onresult = (event: SpeechRecognitionEvent) => {
          const parts: string[] = [];
          for (let i = 0; i < event.results.length; i++) {
            parts.push(event.results[i][0].transcript);
          }
          setUserAnswer(parts.join(" "));
        };
        rec.onerror = () => {
          setIsRecording(false);
          isRecordingRef.current = false;
        };
        setSpeechSupported(true);
        setRecognition(rec);
        recognitionRef.current = rec;
      }
    }
  }, [language]);

  useEffect(() => {
    loadVoices().then(setVoices);
  }, []);

  // Acquire mic-only audio track for video recording (with echo cancellation)
  useEffect(() => {
    let track: MediaStreamTrack | null = null;
    navigator.mediaDevices
      ?.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        video: false,
      })
      .then((stream) => {
        track = stream.getAudioTracks()[0];
        audioTrackRef.current = track;
      })
      .catch(() => {
        // Mic not available — recording will be video-only or skipped
      });
    return () => {
      track?.stop();
      audioTrackRef.current = null;
    };
  }, []);

  // Cleanup recording session on unmount
  useEffect(() => {
    return () => {
      recordingSessionRef.current?.cleanup();
      recordingSessionRef.current = null;
    };
  }, []);

  const uploadAndLinkVideo = (blob: Blob, answerId: number) => {
    uploadVideoBlob(blob, params.interviewId, answerId)
      .then((url) => { if (url) updateVideoUrl(answerId, url).catch(console.error); })
      .catch(console.error);
  };

  const startVideoRecording = () => {
    try {
      recordingSessionRef.current?.cleanup();
      const video = webcamRef.current?.video;
      if (!video?.srcObject) return;
      const videoTrack = (video.srcObject as MediaStream).getVideoTracks()[0];
      if (!videoTrack) return;

      const audioTrack = audioTrackRef.current;
      if (!audioTrack) {
        console.warn("No audio track available, skipping video recording");
        return;
      }

      const session = createRecordingSession(videoTrack, audioTrack);
      session.start();
      recordingSessionRef.current = session;
    } catch {
      // MediaRecorder not supported — graceful degradation
    }
  };

  const stopVideoRecording = async (): Promise<Blob | null> => {
    try {
      if (recordingSessionRef.current?.isActive()) {
        const blob = await recordingSessionRef.current.stop();
        recordingSessionRef.current = null;
        return blob;
      }
    } catch {
      // Recording failed — non-critical
    }
    recordingSessionRef.current = null;
    return null;
  };

  // Auto-read question, then start countdown after speech ends
  useEffect(() => {
    if (questions.length === 0 || !speechSupported || isFollowUpMode) return;

    countdownTimersRef.current.forEach(clearTimeout);
    countdownTimersRef.current = [];
    setCountdown(null);
    window.speechSynthesis?.cancel();

    // Chrome bug workaround: cancel() followed immediately by speak() silently
    // swallows the speech. Adding a 100ms delay between cancel and speak fixes it.
    let fallbackTimer: ReturnType<typeof setTimeout>;
    const speakTimer = setTimeout(() => {
      const text = questions[activeIndex].question;
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = language === "ko" ? "ko-KR" : "en-US";
      const preferredGender = getStoredVoiceGender();
      const availableVoices =
        voices.length > 0 ? voices : window.speechSynthesis.getVoices();
      const selectedVoice = selectVoice(availableVoices, preferredGender, language);
      if (selectedVoice) utterance.voice = selectedVoice;

      let countdownStarted = false;
      const triggerCountdown = () => {
        if (countdownStarted) return;
        countdownStarted = true;
        clearTimeout(fallbackTimer);
        startCountdownSequence();
      };

      utterance.onend = triggerCountdown;
      utterance.onerror = triggerCountdown;

      // Fallback: if onend doesn't fire, start countdown after estimated duration
      const estimatedMs = Math.max(text.length * 80, 3000) + 2000;
      fallbackTimer = setTimeout(triggerCountdown, estimatedMs);

      window.speechSynthesis.speak(utterance);
    }, 100);

    return () => {
      clearTimeout(speakTimer);
      clearTimeout(fallbackTimer!);
      countdownTimersRef.current.forEach(clearTimeout);
      countdownTimersRef.current = [];
      window.speechSynthesis?.cancel();
    };
  }, [activeIndex, questions.length, speechSupported, language, voices]);

  const toggleRecording = () => {
    if (!recognition) return;

    window.speechSynthesis?.cancel();
    countdownTimersRef.current.forEach(clearTimeout);
    countdownTimersRef.current = [];
    setCountdown(null);

    if (isRecording) {
      recognition.stop();
      setIsRecording(false);
      isRecordingRef.current = false;
      stopVideoRecording(); // discard blob — user toggled off manually
    } else {
      setUserAnswer("");
      recognition.start();
      setIsRecording(true);
      isRecordingRef.current = true;
      startVideoRecording();
    }
  };

  const handleTextToSpeech = (text: string) => {
    if (!("speechSynthesis" in window)) return null;
    window.speechSynthesis.cancel();
    // Chrome workaround: delay between cancel and speak
    setTimeout(() => {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = language === "ko" ? "ko-KR" : "en-US";
      const preferredGender = getStoredVoiceGender();
      const availableVoices =
        voices.length > 0 ? voices : window.speechSynthesis.getVoices();
      const selectedVoice = selectVoice(availableVoices, preferredGender, language);
      if (selectedVoice) utterance.voice = selectedVoice;
      window.speechSynthesis.speak(utterance);
    }, 100);
    return true;
  };

  const startCountdownSequence = () => {
    countdownTimersRef.current.forEach(clearTimeout);
    countdownTimersRef.current = [];
    setCountdown(3);
    const t1 = setTimeout(() => setCountdown(2), 1000);
    const t2 = setTimeout(() => setCountdown(1), 2000);
    const t3 = setTimeout(() => {
      setCountdown(null);
      if (!isRecordingRef.current && recognitionRef.current) {
        setUserAnswer("");
        recognitionRef.current.start();
        setIsRecording(true);
        isRecordingRef.current = true;
        startVideoRecording();
      }
    }, 3000);
    countdownTimersRef.current = [t1, t2, t3];
  };

  const moveToNext = () => {
    window.speechSynthesis?.cancel();
    countdownTimersRef.current.forEach(clearTimeout);
    countdownTimersRef.current = [];
    setCountdown(null);

    setFollowUpQuestion(null);
    setIsFollowUpMode(false);
    setParentAnswerId(null);
    setLoadingFollowUp(false);

    if (activeIndex < questions.length - 1) {
      setActiveIndex((prev) => prev + 1);
      setUserAnswer("");
    } else {
      router.push(`/dashboard/interview/${params.interviewId}/feedback`);
    }
  };

  const handleSkipFollowUp = () => {
    moveToNext();
  };

  const handleSubmitAnswer = async () => {
    if (!questions[activeIndex] && !isFollowUpMode) return;

    window.speechSynthesis?.cancel();
    countdownTimersRef.current.forEach(clearTimeout);
    countdownTimersRef.current = [];
    setCountdown(null);

    if (isRecording && recognition) {
      recognition.stop();
      setIsRecording(false);
      isRecordingRef.current = false;
    }

    const currentVideoBlob = await stopVideoRecording();

    setLoading(true);
    try {
      if (isFollowUpMode && followUpQuestion && parentAnswerId) {
        // Submit follow-up answer
        const followUpResult = await submitAnswer(
          params.interviewId,
          followUpQuestion,
          "",
          userAnswer,
          language,
          parentAnswerId,
          difficulty
        );
        moveToNext();

        if (currentVideoBlob) {
          uploadAndLinkVideo(currentVideoBlob, followUpResult.answerId);
        }
      } else {
        // Submit main answer
        const result = await submitAnswer(
          params.interviewId,
          questions[activeIndex].question,
          questions[activeIndex].answer,
          userAnswer,
          language,
          null,
          difficulty
        );

        // Fire-and-forget video upload for main answer
        if (currentVideoBlob) {
          uploadAndLinkVideo(currentVideoBlob, result.answerId);
        }

        // Generate follow-up question
        setLoadingFollowUp(true);
        try {
          const followUp = await generateFollowUpQuestion(
            questions[activeIndex].question,
            questions[activeIndex].answer,
            userAnswer,
            language
          );
          setParentAnswerId(result.answerId);
          setFollowUpQuestion(followUp.followUpQuestion);
          setIsFollowUpMode(true);
          setUserAnswer("");
          // Read the follow-up question aloud, then auto-countdown
          if (speechSupported) {
            window.speechSynthesis?.cancel();
            // Chrome workaround: delay between cancel and speak
            setTimeout(() => {
              const text = followUp.followUpQuestion;
              const utterance = new SpeechSynthesisUtterance(text);
              utterance.lang = language === "ko" ? "ko-KR" : "en-US";
              const preferredGender = getStoredVoiceGender();
              const availableVoices =
                voices.length > 0 ? voices : window.speechSynthesis.getVoices();
              const selectedVoice = selectVoice(availableVoices, preferredGender, language);
              if (selectedVoice) utterance.voice = selectedVoice;

              let countdownStarted = false;
              const triggerCountdown = () => {
                if (countdownStarted) return;
                countdownStarted = true;
                startCountdownSequence();
              };

              utterance.onend = triggerCountdown;
              utterance.onerror = triggerCountdown;
              const estimatedMs = Math.max(text.length * 80, 3000) + 2000;
              setTimeout(triggerCountdown, estimatedMs);

              window.speechSynthesis.speak(utterance);
            }, 100);
          } else {
            handleTextToSpeech(followUp.followUpQuestion);
          }
        } catch {
          // If follow-up generation fails, just move to next
          moveToNext();
        } finally {
          setLoadingFollowUp(false);
        }
      }
    } catch (error) {
      console.error("Failed to submit answer:", error);
    } finally {
      setLoading(false);
    }
  };

  if (questions.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="py-10">
      {/* Progress bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-muted-foreground">
            {t("interview.questionOf", { current: activeIndex + 1, total: questions.length })}
          </span>
          <span className="text-sm font-medium text-primary">
            {Math.round(((activeIndex + 1) / questions.length) * 100)}%
          </span>
        </div>
        <div className="h-2 rounded-full bg-secondary overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
            style={{
              width: `${((activeIndex + 1) / questions.length) * 100}%`,
            }}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Questions Panel */}
        <div className="flex flex-col gap-5">
          {/* Question Tabs */}
          <div className="flex flex-wrap gap-2">
            {questions.map((_, index) => (
              <button
                key={index}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                  activeIndex === index
                    ? "bg-primary text-primary-foreground shadow-md"
                    : index < activeIndex
                      ? "bg-primary/10 text-primary"
                      : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                }`}
                onClick={() => setActiveIndex(index)}
              >
                Q{index + 1}
              </button>
            ))}
          </div>

          {/* Current Question */}
          <div className="p-6 rounded-xl border bg-card">
            <h3 data-testid="question-text" className="text-lg font-medium leading-relaxed">
              {questions[activeIndex].question}
            </h3>
            <Button
              variant="ghost"
              size="sm"
              className="mt-3 text-muted-foreground hover:text-primary"
              onClick={() =>
                handleTextToSpeech(questions[activeIndex].question)
              }
            >
              <Volume2 className="mr-1.5 h-4 w-4" /> {t("interview.readAloud")}
            </Button>
          </div>

          {/* Follow-up Loading */}
          {loadingFollowUp && (
            <div className="p-6 rounded-xl border bg-card flex items-center gap-3">
              <Loader className="animate-spin h-4 w-4" />
              <span className="text-sm text-muted-foreground">{t("interview.generatingFollowUp")}</span>
            </div>
          )}

          {/* Follow-up Question */}
          {isFollowUpMode && followUpQuestion && (
            <div className="p-6 rounded-xl border-2 border-amber-300 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-700">
              <span className="inline-block px-2.5 py-0.5 rounded-md bg-amber-500 text-white text-xs font-semibold mb-3">
                {t("interview.followUp")}
              </span>
              <h3 className="text-lg font-medium leading-relaxed">
                {followUpQuestion}
              </h3>
              <Button
                variant="ghost"
                size="sm"
                className="mt-3 text-muted-foreground hover:text-primary"
                onClick={() => handleTextToSpeech(followUpQuestion)}
              >
                <Volume2 className="mr-1.5 h-4 w-4" /> {t("interview.readAloud")}
              </Button>
            </div>
          )}

          {/* User Answer Display */}
          <div className="p-6 rounded-xl border bg-card min-h-[120px]">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
              {t("interview.yourAnswer")}
            </p>
            <p
              className={
                userAnswer
                  ? "text-foreground leading-relaxed"
                  : "text-muted-foreground/60 italic"
              }
            >
              {userAnswer || t("interview.recordPlaceholder")}
            </p>
          </div>

          {/* Controls */}
          <div className="flex flex-col gap-3">
            {speechSupported ? (
              <div className="flex gap-3">
                <Button
                  data-testid="record-button"
                  variant={isRecording ? "destructive" : "default"}
                  onClick={toggleRecording}
                  disabled={countdown !== null}
                >
                  {isRecording ? (
                    <>
                      <span className="relative mr-2 flex h-3 w-3">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white/60" />
                        <span className="relative inline-flex h-3 w-3 rounded-full bg-white" />
                      </span>
                      {t("interview.stopRecording")}
                    </>
                  ) : (
                    <>
                      <Mic className="mr-2 h-4 w-4" /> {t("interview.recordAnswer")}
                    </>
                  )}
                </Button>

                <Button
                  data-testid="submit-answer-button"
                  onClick={handleSubmitAnswer}
                  disabled={loading || loadingFollowUp || !userAnswer}
                >
                  {loading ? (
                    <>
                      <Loader className="animate-spin mr-2 h-4 w-4" />{" "}
                      {t("interview.submitting")}
                    </>
                  ) : isFollowUpMode ? (
                    t("interview.submitFollowUp")
                  ) : activeIndex === questions.length - 1 ? (
                    t("interview.submitFinish")
                  ) : (
                    t("interview.submitNext")
                  )}
                </Button>

                {isFollowUpMode && (
                  <Button variant="ghost" onClick={handleSkipFollowUp}>
                    <SkipForward className="mr-2 h-4 w-4" /> {t("interview.skipFollowUp")}
                  </Button>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <Textarea
                  data-testid="answer-textarea"
                  placeholder={t("interview.typePlaceholder")}
                  value={userAnswer}
                  onChange={(e) => setUserAnswer(e.target.value)}
                  rows={4}
                />
                <div className="flex gap-3">
                  <Button
                    onClick={handleSubmitAnswer}
                    disabled={loading || loadingFollowUp || !userAnswer}
                  >
                    {loading ? (
                      <>
                        <Loader className="animate-spin mr-2 h-4 w-4" />{" "}
                        {t("interview.submitting")}
                      </>
                    ) : isFollowUpMode ? (
                      t("interview.submitFollowUp")
                    ) : activeIndex === questions.length - 1 ? (
                      t("interview.submitFinish")
                    ) : (
                      t("interview.submitNext")
                    )}
                  </Button>

                  {isFollowUpMode && (
                    <Button variant="ghost" onClick={handleSkipFollowUp}>
                      <SkipForward className="mr-2 h-4 w-4" /> {t("interview.skipFollowUp")}
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Webcam Panel */}
        <div className="flex justify-center relative h-72 overflow-hidden rounded-xl">
          <Webcam
            ref={webcamRef}
            mirrored
            className="w-full h-full object-cover border"
          />
          {countdown !== null && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 rounded-xl">
              <p className="text-6xl font-bold text-white">{countdown}</p>
              <p className="text-white/80 text-sm mt-2">
                {t("interview.startingIn")}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
