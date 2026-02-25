
// Helper function to get coordinates from an address using a free geocoding API (e.g., Nominatim)
export async function getCoordinatesFromAddress(address: string): Promise<{ lat: number, lon: number } | null> {
    try {
        const query = encodeURIComponent(address);
        // Using Nominatim (OpenStreetMap) - requires User-Agent
        const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1`, {
            headers: {
                'User-Agent': 'VMPay-SaaS-App/1.0'
            }
        });

        if (!res.ok) return null;

        const data = await res.json();
        if (data && data.length > 0) {
            return {
                lat: parseFloat(data[0].lat),
                lon: parseFloat(data[0].lon)
            };
        }
        return null;
    } catch (e) {
        console.error("Failed to geocode address:", e);
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

        // Consider it a 'rainy day' if probability > 40% and amount > 1.0mm
        const willRain = probability >= 40 && amount >= 1.0;

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
