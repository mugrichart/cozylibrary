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
    const [activeRef, setActiveRef] = useState<'primary' | 'secondary'>('primary');

    useEffect(() => {
        primaryAudioRef.current = new Audio();
        secondaryAudioRef.current = new Audio();

        primaryAudioRef.current.loop = true;
        secondaryAudioRef.current.loop = true;

        return () => {
            primaryAudioRef.current?.pause();
            secondaryAudioRef.current?.pause();
        };
    }, []);

    const playMood = (audioPath: string, moodName: string) => {
        if (soundState.currentMood === moodName) return;

        const current = activeRef === 'primary' ? primaryAudioRef.current : secondaryAudioRef.current;
        const next = activeRef === 'primary' ? secondaryAudioRef.current : primaryAudioRef.current;

        if (!next) return;

        console.log(`Transitioning to mood: ${moodName} using path: ${audioPath}`);

        next.src = audioPath;
        next.volume = 0;

        if (soundState.isPlaying) {
            next.play().catch(e => console.error("Audio play failed:", e));
        }

        // Improved Cross-fade
        const FADE_DURATION = 4000; // 4 seconds
        const FADE_INTERVAL = 50;   // 50ms steps (smoother)
        const totalSteps = FADE_DURATION / FADE_INTERVAL;
        let step = 0;

        const fadeInterval = setInterval(() => {
            step++;
            const progress = step / totalSteps;

            // Quadratic curves for more natural hearing perception
            const fadeInVol = Math.pow(progress, 2);
            const fadeOutVol = Math.pow(1 - progress, 2);

            if (current) current.volume = Math.max(0, soundState.volume * fadeOutVol);
            next.volume = Math.min(soundState.volume, soundState.volume * fadeInVol);

            if (step >= totalSteps) {
                clearInterval(fadeInterval);
                current?.pause();
                setActiveRef(activeRef === 'primary' ? 'secondary' : 'primary');
                setSoundState(prev => ({ ...prev, currentMood: moodName }));
            }
        }, FADE_INTERVAL);
    };

    const togglePlay = () => {
        const active = activeRef === 'primary' ? primaryAudioRef.current : secondaryAudioRef.current;
        if (!active) return;

        if (soundState.isPlaying) {
            active.pause();
        } else {
            active.play().catch(e => console.error("Audio play failed:", e));
        }
        setSoundState(prev => ({ ...prev, isPlaying: !prev.isPlaying }));
    };

    const setVolume = (vol: number) => {
        const active = activeRef === 'primary' ? primaryAudioRef.current : secondaryAudioRef.current;
        if (active) active.volume = vol;
        setSoundState(prev => ({ ...prev, volume: vol }));
    };

    return {
        soundState,
        playMood,
        togglePlay,
        setVolume
    };
}
