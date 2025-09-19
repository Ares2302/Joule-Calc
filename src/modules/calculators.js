import { GRAIN_TO_GRAM, FPS_TO_MPS } from '../constants.js';

/**
 * Calcola l'energia in Joule.
 * @param {number} peso - Il peso del proiettile.
 * @param {number} velocita - La velocità del proiettile.
 * @param {boolean} isImperiale - Se le unità sono imperiali (grani e fps).
 * @returns {number} L'energia calcolata in Joule.
 * @throws {Error} Se i valori di input non sono validi.
 */
export function calculateJoule(peso, velocita, isImperiale) {
    if (isNaN(peso) || isNaN(velocita) || peso <= 0 || velocita <= 0) {
        throw new Error('Valori di input non validi.');
    }

    if (isImperiale) {
        peso = peso * GRAIN_TO_GRAM;
        velocita = velocita * FPS_TO_MPS;
    }

    const pesoKg = peso / 1000;
    return 0.5 * pesoKg * (velocita * velocita);
}

/**
 * Calcola la velocità necessaria per un dato Joule e peso.
 * @param {number} joule - L'energia desiderata in Joule.
 * @param {number} peso - Il peso del proiettile.
 * @param {boolean} isImperiale - Se le unità sono imperiali.
 * @returns {{mps: number, fps: number}} Le velocità calcolate.
 * @throws {Error} Se i valori di input non sono validi.
 */
export function calculateInverseVelocity(joule, peso, isImperiale) {
    if (isNaN(joule) || isNaN(peso) || joule <= 0 || peso <= 0) {
        throw new Error('Valori di input non validi.');
    }

    let pesoKg;
    if (isImperiale) {
        pesoKg = (peso * GRAIN_TO_GRAM) / 1000;
    } else {
        pesoKg = peso / 1000;
    }

    const mps = Math.sqrt((2 * joule) / pesoKg);
    const fps = mps / FPS_TO_MPS;

    return { mps, fps };
}

/**
 * Calcola la correzione MOA/MRAD.
 * @param {object} params - I parametri per il calcolo.
 * @returns {{elevation: object, windage: object}} I valori di correzione.
 * @throws {Error} Se i valori di input non sono validi.
 */
export function calculateMOA(params) {
    const { isMrad, distance, drop, drift, clickValue } = params;

    if (isNaN(distance) || distance <= 0 || (drop <= 0 && drift <= 0)) {
        throw new Error('Distanza o deviazione non valide.');
    }

    const calculateCorrection = (deviation) => {
        if (deviation <= 0) return { value: 0, clicks: 0 };
        let value;
        if (isMrad) {
            value = deviation / (distance / 10);
        } else {
            const MOA_AT_100M_IN_CM = 2.9089;
            value = (deviation / distance) * 100 / MOA_AT_100M_IN_CM;
        }
        const clicks = value / clickValue;
        return { value, clicks };
    };

    return {
        elevation: calculateCorrection(drop),
        windage: calculateCorrection(drift),
    };
}
