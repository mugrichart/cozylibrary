'use client';

import { useState, useEffect, useRef } from 'react';

export interface SoundState {
    isPlaying: boolean;
    currentMood: string | null;
    volume: number;
}

export function useSoundPlayer() {
    const [soundState, setSoundState] = useState<SoundState>({
        isPlaying: false,
        currentMood: null,
        volume: 0.5,
    });

    const primaryAudioRef = useRef<HTMLAudioElement | null>(null);
    const secondaryAudioRef = useRef<HTMLAudioElement | null>(null);
    const fadeIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // Track which audio element is currently the "active/main" one
    // 'primary' means primaryAudioRef is playing the current mood
    // 'secondary' means secondaryAudioRef is playing the current mood
    const activeRefObj = useRef<'primary' | 'secondary'>('primary');

    useEffect(() => {
        primaryAudioRef.current = new Audio();
        secondaryAudioRef.current = new Audio();

        primaryAudioRef.current.loop = true;
        secondaryAudioRef.current.loop = true;

        // Initial volume set
        primaryAudioRef.current.volume = soundState.volume;
        secondaryAudioRef.current.volume = 0; // Start mixed out

        return () => {
            if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);
            primaryAudioRef.current?.pause();
            secondaryAudioRef.current?.pause();
        };
    }, []);

    // Watch volume changes and update active audio immediately
    // For ongoing fades, the interval handles it, but instantaneous volume changes need this
    useEffect(() => {
        const active = activeRefObj.current === 'primary' ? primaryAudioRef.current : secondaryAudioRef.current;
        const inactive = activeRefObj.current === 'primary' ? secondaryAudioRef.current : primaryAudioRef.current;

        if (active && !fadeIntervalRef.current) {
            // Only update strictly if NOT fading. If fading, let the interval handle volumes.
            active.volume = soundState.volume;
        }
        if (inactive && !fadeIntervalRef.current) {
            inactive.volume = 0;
        }
    }, [soundState.volume]);


    const playMood = (audioPath: string, moodName: string) => {
        if (soundState.currentMood === moodName) return;

        // Determine current ACTIVE (outgoing) and NEXT (incoming)
        const outgoing = activeRefObj.current === 'primary' ? primaryAudioRef.current : secondaryAudioRef.current;
        const incoming = activeRefObj.current === 'primary' ? secondaryAudioRef.current : primaryAudioRef.current;

        if (!incoming || !outgoing) return;

        console.log(`Transitioning to mood: ${moodName} using path: ${audioPath}`);

        // 1. CLEAR existing fade if any
        if (fadeIntervalRef.current) {
            clearInterval(fadeIntervalRef.current);
            fadeIntervalRef.current = null;
            // Snapping volumes not strictly necessary but safer?
            // Actually, better to start fade from CURRENT volumes to avoid pops.
        }

        // 2. Setup Incoming
        incoming.src = audioPath;
        incoming.volume = 0; // Start silent

        if (soundState.isPlaying) {
            incoming.play().catch(e => console.error("Audio play failed:", e));
            if (outgoing.paused) outgoing.play().catch(e => console.error("Audio play failed:", e));
        }

        // 3. Start Cross-fade
        const FADE_DURATION = 3000; // 3 seconds
        const FADE_INTERVAL = 50;
        const totalSteps = FADE_DURATION / FADE_INTERVAL;
        let step = 0;

        // Capture starting volumes to interpolate from
        const startOutgoingVol = outgoing.volume;
        const startIncomingVol = incoming.volume; // Usually 0
        const targetVol = soundState.volume;

        // Update currentMood state immediately to act as a guard
        setSoundState(prev => ({ ...prev, currentMood: moodName }));

        fadeIntervalRef.current = setInterval(() => {
            step++;
            const progress = step / totalSteps;

            // Linear interpolation for simplicity / predictability in rapid switches
            const fadeOutVol = startOutgoingVol * (1 - progress);
            const fadeInVol = targetVol * progress;

            outgoing.volume = Math.max(0, fadeOutVol);
            incoming.volume = Math.min(targetVol, fadeInVol);

            if (step >= totalSteps) {
                if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);
                fadeIntervalRef.current = null;

                outgoing.pause();
                outgoing.currentTime = 0; // Reset outgoing

                // Swap active ref
                activeRefObj.current = activeRefObj.current === 'primary' ? 'secondary' : 'primary';
            }
        }, FADE_INTERVAL);
    };

    const togglePlay = () => {
        const active = activeRefObj.current === 'primary' ? primaryAudioRef.current : secondaryAudioRef.current;
        const inactive = activeRefObj.current === 'primary' ? secondaryAudioRef.current : primaryAudioRef.current;

        if (!active) return;

        if (soundState.isPlaying) {
            active.pause();
            if (inactive) inactive.pause(); // Pause both just in case
        } else {
            active.play().catch(e => console.error("Audio play failed:", e));
            // If we were mid-fade (unlikely if strictly toggling), we might want to resume both? 
            // For now, simple toggle.
        }
        setSoundState(prev => ({ ...prev, isPlaying: !prev.isPlaying }));
    };

    const setVolume = (vol: number) => {
        setSoundState(prev => ({ ...prev, volume: vol }));
        // Effect hook handles the actual audio volume update
    };

    return {
        soundState,
        playMood,
        togglePlay,
        setVolume
    };
}
