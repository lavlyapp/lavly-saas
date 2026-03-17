
// Helper function to get coordinates from an address using a free geocoding API (e.g., Nominatim)
export async function getCoordinatesFromAddress(address: string, city?: string, state?: string): Promise<{ lat: number, lon: number } | null> {
    try {
        // Build a more precise query if city and state are provided
        let queryText = address;
        if (city) queryText += `, ${city}`;
        if (state) queryText += `, ${state}`;
        queryText += `, Brasil`;

        const query = encodeURIComponent(queryText);

        // Set an explicit 3-second timeout so the UI never freezes for minutes if Nominatim is degraded
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3500);

        // Using Nominatim (OpenStreetMap) - requires User-Agent
        const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1`, {
            headers: {
                'User-Agent': 'Lavly-App/1.0 (brasil)'
            },
            signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (!res.ok) {
            console.error(`Geocoding failed for ${queryText}: ${res.status}`);
            return null;
        }

        const data = await res.json();
        if (data && data.length > 0) {
            console.log(`Geocoding success for ${queryText}:`, data[0].lat, data[0].lon);
            return {
                lat: parseFloat(data[0].lat),
                lon: parseFloat(data[0].lon)
            };
        }

        return null;
    } catch (e: any) {
        if (e.name === 'AbortError') {
            console.warn(`Geocoding forcibly timed out to text strict SLAs for: ${address}`);
        } else {
            console.error("Failed to geocode address:", e);
        }
        return null;
    }
}

export async function checkRainForecast(lat: number, lon: number): Promise<{ willRain: boolean, rainProbability: number, expectedAmount: number }> {
    try {
        // Fetch daily forecast for today
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=precipitation_sum,precipitation_probability_max&timezone=auto&forecast_days=1`;
        const res = await fetch(url);
        if (!res.ok) throw new Error("Weather API failed");

        const data: any = await res.json();

        const probability = data.daily?.precipitation_probability_max?.[0] || 0;
        const amount = data.daily?.precipitation_sum?.[0] || 0;

        // Consider it a 'rainy day' if probability >= 40% and amount >= 0.5mm
        // Lowered amount slightly to be more sensitive to light rain that still affects laundry
        const willRain = probability >= 40 && amount >= 0.5;

        return {
            willRain,
            rainProbability: probability,
            expectedAmount: amount
        };
    } catch (e) {
        console.error("Failed to fetch weather:", e);
        // Fail closed (no alert) if API is down
        return { willRain: false, rainProbability: 0, expectedAmount: 0 };
    }
}
