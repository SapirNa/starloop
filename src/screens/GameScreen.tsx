import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import ComboFeedback from '../components/ComboFeedback';
import ObjectiveTutorialModal from '../components/ObjectiveTutorialModal';
import PauseModal from '../components/PauseModal';
import PowerUpOrb, { type PowerUpOrbState } from '../components/PowerUpOrb';
import PulseText from '../components/PulseText';
import TimeBonusFeedback, { type TimeBonusFeedbackValue } from '../components/TimeBonusFeedback';
import TutorialOverlay from '../components/TutorialOverlay';
import GameIcon from '../components/ui/GameIcon';
import { EXTRA_TIME_BONUS_SECONDS } from '../config/starTypes';
import { COLORS, SPACING } from '../theme/theme';
import { getNextObjectiveTutorial } from '../data/objectiveTutorials';
import { getTutorialStep } from '../data/tutorial';
import { LEVELS } from '../data/levels';
import GameCanvas from '../gameplay/GameCanvas';
import { describeObjective } from '../gameplay/objectives';
import { POWER_UPS } from '../gameplay/powerUps';
import { impactHeavy, impactMedium, notificationSuccess, selection } from '../services/haptics';
import { useAdsStore } from '../stores/useAdsStore';
import { useEconomyStore } from '../stores/useEconomyStore';
import { useGameStore } from '../stores/useGameStore';
import { usePlayerStatsStore } from '../stores/usePlayerStatsStore';
import { useProgressStore } from '../stores/useProgressStore';
import { useTutorialStore } from '../stores/useTutorialStore';
import { RootStackParamList } from '../types/navigation';
import { calculateRating } from '../utils/scoring';

type Props = NativeStackScreenProps<RootStackParamList, 'Game'>;

interface CanvasSize {
  width: number;
  height: number;
}

export default function GameScreen({ route, navigation }: Props) {
  const { levelId } = route.params;
  const level = useMemo(() => LEVELS.find((item) => item.id === levelId) ?? null, [levelId]);
  const tutorialStep = useMemo(() => getTutorialStep(levelId), [levelId]);
  const insets = useSafeAreaInsets();

  const [canvasSize, setCanvasSize] = useState<CanvasSize | null>(null);
  const [timeBonusFeedback, setTimeBonusFeedback] = useState<TimeBonusFeedbackValue | null>(null);
  // The store's sessionId this screen instance itself started (null until
  // it has). A previous level's screen can still be mid-unmount (native
  // stack transitions can defer that) when this one mounts, leaving the
  // store briefly showing the OLD session's 'completed' status/score - both
  // the completion redirect below and the unmount cleanup compare against
  // this ref so they only ever act on a session this instance actually
  // started, never on stale leftovers from the one before it.
  const startedSessionIdRef = useRef<number | null>(null);

  const startLevel = useGameStore((state) => state.startLevel);
  const submitLoop = useGameStore((state) => state.submitLoop);
  const reset = useGameStore((state) => state.reset);
  const pause = useGameStore((state) => state.pause);
  const resume = useGameStore((state) => state.resume);
  const activatePowerUp = useGameStore((state) => state.activatePowerUp);
  const stars = useGameStore((state) => state.stars);
  const score = useGameStore((state) => state.score);
  const loopsUsed = useGameStore((state) => state.loopsUsed);
  const elapsedSeconds = useGameStore((state) => state.elapsedSeconds);
  const bestCombo = useGameStore((state) => state.bestCombo);
  const goldCaptured = useGameStore((state) => state.goldCaptured);
  const loopCaptureCounts = useGameStore((state) => state.loopCaptureCounts);
  const status = useGameStore((state) => state.status);
  const failureReason = useGameStore((state) => state.failureReason);
  const isPaused = useGameStore((state) => state.isPaused);
  const freezeSecondsRemaining = useGameStore((state) => state.freezeSecondsRemaining);
  const comboFeedback = useGameStore((state) => state.comboFeedback);
  const sessionId = useGameStore((state) => state.sessionId);
  const powerUpInventory = useEconomyStore((state) => state.powerUpInventory);
  const hasSeenTutorial = useTutorialStore((state) => state.hasSeen);
  const markTutorialSeen = useTutorialStore((state) => state.markSeen);
  const seenObjectiveTutorials = useTutorialStore((state) => state.seenObjectiveTutorials);

  // Derived, not stored: as long as the level hasn't been started
  // (status stays 'idle' until startLevel runs) and this level introduces
  // an objective/constraint not yet in seenObjectiveTutorials, this is
  // non-null - which is also what keeps GameCanvas from rendering/ticking
  // behind the modal, see the canvasArea render below. Recomputes to null
  // the instant either condition flips (startLevel called, or the tutorial
  // gets marked seen), no separate state to keep in sync.
  const pendingObjectiveTutorial =
    level && status === 'idle' ? getNextObjectiveTutorial(level, seenObjectiveTutorials) : null;

  // Start a fresh session whenever this screen mounts for a level and the
  // canvas has been measured (and no objective-tutorial modal is pending -
  // see handleDismissObjectiveTutorial, which starts it once "GOT IT" is
  // pressed instead). Re-entering a completed level (replay) goes through
  // this same path, since the store always resets on startLevel.
  useEffect(() => {
    if (!level || !canvasSize) return;
    // The cleanup must be registered even when the tutorial gate skips
    // startLevel here (it runs later, imperatively, from
    // handleDismissObjectiveTutorial) - otherwise this component can
    // unmount without ever resetting the store, leaving a stale
    // 'completed' status + score behind for every future level's mount.
    if (!pendingObjectiveTutorial) {
      startLevel(level, canvasSize.width, canvasSize.height, route.params.continueBonus);
      startedSessionIdRef.current = useGameStore.getState().sessionId;
    }
    return () => {
      if (startedSessionIdRef.current !== null) reset(startedSessionIdRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- start once per (level, canvasSize) pair; pendingObjectiveTutorial is only read as a gate, not something that should retrigger this
  }, [level, canvasSize]);

  const handleDismissObjectiveTutorial = () => {
    if (!pendingObjectiveTutorial || !level || !canvasSize) return;
    useTutorialStore.getState().markObjectiveTutorialSeen(pendingObjectiveTutorial.id);
    startLevel(level, canvasSize.width, canvasSize.height, route.params.continueBonus);
    startedSessionIdRef.current = useGameStore.getState().sessionId;
  };

  // Only ticks while playing and not paused; timers that aren't relevant to
  // the level's objective are simply ignored by evaluateObjective.
  useEffect(() => {
    if (status !== 'playing' || isPaused) return;
    const interval = setInterval(() => useGameStore.getState().tick(), 1000);
    return () => clearInterval(interval);
  }, [status, isPaused]);

  // Pause automatically when the app leaves the foreground (backgrounded,
  // call received, etc). Deliberately does NOT auto-resume on return - the
  // player taps Resume, so they're not surprised by the timer already
  // running against a screen they haven't looked at yet.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState !== 'active') pause();
    });
    return () => subscription.remove();
  }, [pause]);

  // The tutorial demonstration dismisses itself the moment the player
  // submits their first loop (success or not - the point is they tried the
  // gesture), so it never lingers over real gameplay.
  useEffect(() => {
    if (tutorialStep && loopsUsed > 0) markTutorialSeen(tutorialStep.levelId);
  }, [tutorialStep, loopsUsed, markTutorialSeen]);

  useEffect(() => {
    if (!level || status === 'idle' || status === 'playing') return;
    // Guards against a leftover 'completed'/'failed' status from the
    // PREVIOUS level's session, still sitting in the store because that
    // screen's unmount (and reset cleanup) hasn't happened yet when this
    // one mounts - without this check that stale status/score would
    // redirect straight back to LevelComplete/LevelFailed before this
    // screen's own startLevel ever got a chance to run.
    if (startedSessionIdRef.current === null || sessionId !== startedSessionIdRef.current) return;

    if (status === 'completed') {
      const rating = calculateRating(level, score);
      const loopsUsedAtCompletion = useGameStore.getState().loopsUsed;

      const isFirstCompletion = useProgressStore
        .getState()
        .recordLevelResult(level.id, score, rating);
      usePlayerStatsStore.getState().recordLevelCompletion(loopsUsedAtCompletion);

      const coinsEarned = isFirstCompletion ? level.rewardCoins : 0;
      if (coinsEarned > 0) useEconomyStore.getState().addCoins(coinsEarned);

      const levelIndex = LEVELS.findIndex((item) => item.id === level.id);
      const nextLevel = LEVELS[levelIndex + 1];
      if (nextLevel) useProgressStore.getState().unlockLevel(nextLevel.id);

      // Counted here (once per *completed* level - the interstitial cadence
      // rules are specifically about completed levels) regardless of
      // whether an interstitial ends up showing - the frequency rules
      // (services/ads/adFrequency.ts) decide that when LevelCompleteScreen
      // actually asks.
      useAdsStore.getState().recordLevelCompletedForInterstitial();

      navigation.replace('LevelComplete', {
        levelId: level.id,
        score,
        rating,
        coinsEarned,
      });
    } else if (status === 'failed') {
      // Threaded through unchanged - only LevelFailedScreen increments it,
      // at the moment a continuation is actually granted.
      navigation.replace('LevelFailed', {
        levelId: level.id,
        score,
        reason: failureReason,
        continuationsUsed: route.params.continuationsUsed,
      });
    }
  }, [status, level, score, sessionId, failureReason, navigation, route.params.continuationsUsed]);

  const handleCanvasLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setCanvasSize((prev) =>
      prev && prev.width === width && prev.height === height ? prev : { width, height }
    );
  }, []);

  if (!level) {
    return (
      <View style={styles.container}>
        <Text style={styles.hudText}>Level not found</Text>
      </View>
    );
  }

  const objectiveHint = describeObjective(level, {
    stars,
    score,
    loopsUsed,
    elapsedSeconds,
    bestCombo,
    goldCaptured,
    loopCaptureCounts,
  });

  // Adding time only means something on a level with a timer to extend -
  // the store refuses the activation either way (see useGameStore), this
  // just decides how the control communicates it up front.
  const isTimedLevel = level.timeLimit !== null;
  const freezeCharges = powerUpInventory.FREEZE_TIME ?? 0;
  const timeCharges = powerUpInventory.EXTRA_TIME ?? 0;
  const canActivatePowerUp = status === 'playing' && !isPaused;

  const freezeState: PowerUpOrbState =
    freezeSecondsRemaining > 0
      ? 'active'
      : canActivatePowerUp && freezeCharges > 0
        ? 'available'
        : 'unavailable';
  const timeState: PowerUpOrbState =
    isTimedLevel && canActivatePowerUp && timeCharges > 0 ? 'available' : 'unavailable';

  const handleActivateFreeze = () => {
    if (activatePowerUp('FREEZE_TIME')) void impactHeavy();
  };

  const handleActivateTimeBonus = () => {
    if (activatePowerUp('EXTRA_TIME')) {
      void impactMedium();
      void notificationSuccess();
      setTimeBonusFeedback((prev) => ({
        seconds: EXTRA_TIME_BONUS_SECONDS,
        seq: (prev?.seq ?? 0) + 1,
      }));
    }
  };

  const showTutorial =
    !!tutorialStep && !hasSeenTutorial(tutorialStep.levelId) && loopsUsed === 0 && status === 'playing';
  const tutorialTargets =
    showTutorial && tutorialStep
      ? tutorialStep.starIndices.map((i) => stars[i]).filter((s): s is (typeof stars)[number] => !!s)
      : [];

  return (
    <View style={styles.container}>
      <View style={[styles.hud, { paddingTop: insets.top + SPACING.md }]}>
        <View style={styles.hudRow}>
          <Text style={styles.hudTitle}>{level.name}</Text>
          <PulseText text={`Score: ${score}`} style={styles.hudText} />
        </View>
        <View style={styles.hudRow}>
          <View style={styles.objectiveRow}>
            <Text style={styles.hudText}>{objectiveHint}</Text>
            <TimeBonusFeedback feedback={timeBonusFeedback} />
          </View>
          <Pressable
            onPress={() => {
              void selection();
              pause();
            }}
            hitSlop={8}
          >
            <GameIcon name="pause" size={20} color={COLORS.textMuted} />
          </Pressable>
        </View>
      </View>

      <View style={styles.canvasArea} onLayout={handleCanvasLayout}>
        {canvasSize && status !== 'idle' && (
          <GameCanvas
            width={canvasSize.width}
            height={canvasSize.height}
            stars={stars}
            paused={isPaused}
            frozen={freezeSecondsRemaining > 0}
            onLoopDrawn={submitLoop}
          />
        )}
        <ComboFeedback feedback={comboFeedback} />
        {showTutorial && tutorialStep && (
          <TutorialOverlay
            targets={tutorialTargets}
            message={tutorialStep.message}
            onSkip={() => markTutorialSeen(tutorialStep.levelId)}
          />
        )}
      </View>

      <View style={[styles.powerUpRow, { paddingBottom: insets.bottom + SPACING.md }]}>
        <PowerUpOrb
          icon={POWER_UPS.FREEZE_TIME.icon}
          label="Freeze"
          accentColor={COLORS.primary}
          state={freezeState}
          quantity={freezeCharges}
          statusOverride={freezeSecondsRemaining > 0 ? `${freezeSecondsRemaining}s` : undefined}
          onActivate={handleActivateFreeze}
        />
        <PowerUpOrb
          icon={POWER_UPS.EXTRA_TIME.icon}
          label="Time+"
          accentColor={COLORS.gold}
          state={timeState}
          quantity={timeCharges}
          statusOverride={!isTimedLevel ? 'No Timer' : undefined}
          onActivate={handleActivateTimeBonus}
        />
      </View>

      <PauseModal
        visible={isPaused}
        onResume={resume}
        onQuit={() =>
          navigation.reset({
            index: 2,
            routes: [
              { name: 'Home' },
              { name: 'WorldMap' },
              { name: 'LevelSelect', params: { worldId: level.worldId } },
            ],
          })
        }
      />

      <ObjectiveTutorialModal
        tutorial={pendingObjectiveTutorial}
        onDismiss={handleDismissObjectiveTutorial}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  hud: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.sm,
    gap: SPACING.xs,
  },
  hudRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  hudTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '700',
  },
  hudText: {
    color: COLORS.textMuted,
    fontSize: 15,
    fontWeight: '600',
  },
  objectiveRow: {
    position: 'relative',
  },
  canvasArea: {
    flex: 1,
  },
  // Deliberately roomier than a standard button row - FREEZE/TIME+ are
  // important tools, not secondary navigation, and this sits below the
  // drawing area (canvasArea is flex:1 above it) so it never competes for
  // space with gameplay. Centered for comfortable one-handed reach on both
  // small and large screens.
  powerUpRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SPACING.xl,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xs,
  },
});
