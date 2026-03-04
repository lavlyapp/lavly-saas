import { useState, useEffect, useMemo } from 'react';
import { checkRainForecast, getCoordinatesFromAddress } from '../lib/weather';
import { CustomerProfile, SegmentedCustomer } from '../lib/processing/crm';
import { getDay } from 'date-fns';

interface WeatherAlertState {
    loading: boolean;
    isRainy: boolean;
    rainProbability: number;
    expectedAmount: number;
    isPeakDay: boolean; // Is it a busy day?
    targetAudiences: {
        title: string;
        description: string;
        list: SegmentedCustomer[];
    }[];
    error: string | null;
}

export function useWeatherAlerts(profiles: CustomerProfile[], storeAddress: string, topDays: string[], latitude?: number, longitude?: number) {
    const [state, setState] = useState<WeatherAlertState>({
        loading: true,
        isRainy: false,
        rainProbability: 0,
        expectedAmount: 0,
        isPeakDay: false,
        targetAudiences: [],
        error: null
    });

    useEffect(() => {
        async function fetchAlerts() {
            if (!storeAddress || storeAddress.trim() === '') {
                setState(prev => ({ ...prev, loading: false, error: 'Endereço da loja não configurado.' }));
                return;
            }

            try {
                let coords = { lat: latitude, lon: longitude };

                // 1. Get Coordinates if not provided
                if (coords.lat === undefined || coords.lon === undefined) {
                    const fetchedCoords = await getCoordinatesFromAddress(storeAddress);
                    if (!fetchedCoords) {
                        setState(prev => ({ ...prev, loading: false, error: 'Não foi possível encontrar as coordenadas para este endereço.' }));
                        return;
                    }
                    coords = { lat: fetchedCoords.lat, lon: fetchedCoords.lon };
                }

                if (coords.lat === undefined || coords.lon === undefined) {
                    setState(prev => ({ ...prev, loading: false, error: 'Coordenadas inválidas.' }));
                    return;
                }

                // 2. Check Weather
                const weather = await checkRainForecast(coords.lat, coords.lon);

                // --- MOCK WEATHER FOR MVP TESTING / DEMO IF NEEDED ---
                // Override weather data if you want to test the UI regardless of actual rain
                // const isRainyOverride = true; 
                const { willRain, rainProbability, expectedAmount } = weather;

                // 3. Peak Day Logic
                const todayNameDayjs = new Date().toLocaleDateString('pt-BR', { weekday: 'long' });
                // We map JS getDay() to our DAYS_MAP format to compare against topDays
                const DAYS_MAP = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
                const todayName = DAYS_MAP[getDay(new Date())];

                // If today is in the top 3 days of the store, it's a peak day
                const isPeakDay = topDays.includes(todayName);

                // 4. Audience Segmentation
                // First format all profiles into SegmentedCustomer structure needed by the UI Lists
                const formatProfile = (p: CustomerProfile): SegmentedCustomer => ({
                    name: p.name,
                    phone: p.phone,
                    wCount: p.totalWashes || 0,
                    dCount: p.totalDries || 0,
                    totalSpent: p.totalSpent,
                    lastVisit: p.lastVisitDate,
                    debugInfo: `Risco: ${p.churnRisk} | Ciclo Padrão: ${Math.round(p.averageInterval)} dias`
                });

                const audiences = [];

                if (willRain) {
                    // Only prepare lists if it's going to rain and it's past 07:30
                    // Checking hour logic (Optional: Usually handled in UI if we want to hide it completely, 
                    // but we can generate data anyway in the hook)

                    const churnedProfiles = profiles.filter(p => p.churnRisk === 'high' || p.churnRisk === 'medium');

                    // Nearing return: Customers whose nextPredictedVisit is within next 5 days
                    // Meaning they are "ripe" to come back
                    const comingSoonProfiles = profiles.filter(p => {
                        if (p.churnRisk !== 'low') return false; // Exclude already churned from this list
                        const daysToReturn = (p.nextPredictedVisit.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24);
                        return daysToReturn >= 0 && daysToReturn <= 5;
                    });

                    // Rules:
                    // If PEAK DAY -> Message ONLY to Churn Risk (Público B)
                    // If NORMAL CALM DAY -> Message to Churn Risk (Público B) AND Coming Soon (Público A)

                    if (!isPeakDay && comingSoonProfiles.length > 0) {
                        audiences.push({
                            title: 'Público A: Prontos para Retornar 👕',
                            description: 'Clientes ativos cuja previsão natural de retorno para lavar roupa é nos próximos 5 dias. Ideal para adiantar a vinda deles em um dia ocioso.',
                            list: comingSoonProfiles.map(formatProfile)
                        });
                    }

                    if (churnedProfiles.length > 0) {
                        audiences.push({
                            title: 'Público B: Clientes em Risco ⚠️',
                            description: `Clientes com risco médio ou alto de abandono. Dia ${isPeakDay ? 'de pico' : 'tranquilo'} chuvoso é perfeito para engajá-los com gatilho de secagem.`,
                            list: churnedProfiles.map(formatProfile).sort((a, b) => b.totalSpent - a.totalSpent)
                        });
                    }
                }

                setState({
                    loading: false,
                    isRainy: willRain,
                    rainProbability,
                    expectedAmount,
                    isPeakDay,
                    targetAudiences: audiences,
                    error: null
                });

            } catch (err) {
                setState(prev => ({ ...prev, loading: false, error: 'Falha ao processar previsão do tempo.' }));
            }
        }

        if (profiles) { // Remover a checagem length > 0
            fetchAlerts();
        }

    }, [profiles, storeAddress, topDays, latitude, longitude]);

    return state;
}
