lucide.createIcons();

let currentCityData = { name: '', lat: 0, lon: 0 };
let globalWeatherData = null; 
const daysRO = ['Duminică', 'Luni', 'Marți', 'Miercuri', 'Joi', 'Vineri', 'Sâmbătă'];
const monthsRO = ['Ianuarie', 'Februarie', 'Martie', 'Aprilie', 'Mai', 'Iunie', 'Iulie', 'August', 'Septembrie', 'Octombrie', 'Noiembrie', 'Decembrie'];

const inputLanding = document.getElementById('main-search');
const iconLanding = document.getElementById('search-icon-landing');
if (inputLanding) {
    inputLanding.addEventListener('input', () => {
        if(inputLanding.value.length > 0) iconLanding.classList.add('typing-pulse');
        else iconLanding.classList.remove('typing-pulse');
    });
    inputLanding.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSearch('main-search');
    });
}

function showView(viewId) {
    document.getElementById('landing-view').classList.add('hidden');
    document.getElementById('dashboard-view').classList.add('hidden');
    document.getElementById('day-detail-view').classList.add('hidden');
    
    document.getElementById(viewId).classList.remove('hidden');
    
    if (viewId !== 'landing-view') {
        document.getElementById('nav-actions').classList.remove('hidden');
    } else {
        document.getElementById('nav-actions').classList.add('hidden');
        if(document.getElementById('main-search')) document.getElementById('main-search').value = '';
    }
}

function quickSearch(city) {
    document.getElementById('main-search').value = city;
    document.getElementById('search-icon-landing').classList.add('typing-pulse');
    handleSearch('main-search');
}

async function handleSearch(inputId) {
    const inputEl = document.getElementById(inputId);
    const cityInput = inputEl.value.trim();
    if (!cityInput) return;

    document.getElementById('search-icon-landing').classList.remove('typing-pulse');
    const errorMsg = document.getElementById('landing-error');
    if(errorMsg) errorMsg.classList.add('hidden');

    try {
        const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${cityInput}&count=1&language=ro`);
        const geoData = await geoRes.json();

        if (!geoData.results || geoData.results.length === 0) {
            errorMsg.classList.remove('hidden');
            return;
        }

        const city = geoData.results[0];
        
        document.getElementById('city-name-big').innerText = city.name;
        
        const countryText = city.country || '';
        const regionText = city.admin1 ? `${city.admin1}, ` : '';
        const coordsText = `Lat: ${city.latitude.toFixed(2)}° | Lon: ${city.longitude.toFixed(2)}°`;
        
        document.getElementById('city-subtitle').innerHTML = `
            <i data-lucide="map-pin" class="w-5 h-5 text-blue-400"></i>
            <span>${regionText}${countryText}</span>
            <span class="text-slate-400 text-sm ml-2 hidden sm:inline">(${coordsText})</span>
        `;
        lucide.createIcons();

        fetchWeather(city.latitude, city.longitude);

    } catch (error) { console.error("Eroare:", error); }
}

async function useMyLocation() {
    if (!navigator.geolocation) {
        alert("Geolocația nu este suportată.");
        return;
    }
    const locBtn = document.getElementById('btn-location');
    const originalText = locBtn.innerHTML;
    locBtn.innerHTML = '<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i> Se localizează...';
    lucide.createIcons();

    navigator.geolocation.getCurrentPosition(
        async (position) => {
            const lat = position.coords.latitude;
            const lon = position.coords.longitude;
            try {
                const geoRes = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10`);
                const geoData = await geoRes.json();
                
                const cityName = geoData.address.city || geoData.address.town || geoData.address.village || "Locația Mea";
                document.getElementById('city-name-big').innerText = cityName;

                const countryText = geoData.address.country || '';
                const regionName = geoData.address.county || geoData.address.state || '';
                const regionText = regionName ? `${regionName}, ` : '';
                const coordsText = `Lat: ${lat.toFixed(2)}° | Lon: ${lon.toFixed(2)}°`;

                document.getElementById('city-subtitle').innerHTML = `
                    <i data-lucide="map-pin" class="w-5 h-5 text-blue-400"></i>
                    <span>${regionText}${countryText}</span>
                    <span class="text-slate-400 text-sm ml-2 hidden sm:inline">(${coordsText})</span>
                `;
                lucide.createIcons();

                fetchWeather(lat, lon);
            } catch (error) {
                document.getElementById('city-name-big').innerText = "Locația Detectată";
                fetchWeather(lat, lon);
            } finally {
                locBtn.innerHTML = originalText;
                lucide.createIcons();
            }
        }, 
        (error) => {
            locBtn.innerHTML = originalText;
            lucide.createIcons();
            alert("Locație blocată. Folosim Brașov de test.");
            quickSearch('Brașov');
        }, 
        { timeout: 5000 }
    );
}

async function fetchWeather(lat, lon) {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,weather_code,is_day&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset,uv_index_max,wind_speed_10m_max&timezone=auto`;
    try {
        const res = await fetch(url);
        globalWeatherData = await res.json(); 
        
        renderDaysList();
        showView('dashboard-view');
        
    } catch (error) { console.error("Eroare API:", error); }
}

function renderDaysList() {
    const daily = globalWeatherData.daily;
    const container = document.getElementById('days-list-container');
    container.innerHTML = ''; 

    for (let i = 0; i < 7; i++) {
        const dateObj = new Date(daily.time[i]);
        let dayName = daysRO[dateObj.getDay()];
        if (i === 0) dayName = "Astăzi";
        if (i === 1) dayName = "Mâine";

        const wInfo = getWeatherInterpretation(daily.weather_code[i], 1);
        
        const card = document.createElement('div');
        card.className = "day-card bg-slate-800/60 border border-slate-700/60 rounded-2xl p-5 flex items-center justify-between";
        card.setAttribute('onclick', `openDayDetails(${i})`);

        card.innerHTML = `
            <div class="flex items-center gap-4 w-1/3">
                <span class="text-xl font-bold">${dayName}</span>
                <span class="text-sm text-slate-400 hidden md:block">${dateObj.getDate()} ${monthsRO[dateObj.getMonth()]}</span>
            </div>
            
            <div class="flex items-center gap-3 w-1/3 justify-center">
                <img src="${wInfo.iconUrl}" class="w-12 h-12 drop-shadow-lg" alt="Vreme">
                <span class="font-medium text-blue-200 hidden sm:block">${wInfo.desc}</span>
            </div>
            
            <div class="flex items-center justify-end gap-4 w-1/3 text-lg">
                <span class="text-slate-400 font-medium">${Math.round(daily.temperature_2m_min[i])}°</span>
                <span class="text-white font-bold">${Math.round(daily.temperature_2m_max[i])}°</span>
                <i data-lucide="chevron-right" class="text-slate-500 w-5 h-5 ml-2"></i>
            </div>
        `;
        container.appendChild(card);
    }
    lucide.createIcons();
}

function openDayDetails(dayIndex) {
    const daily = globalWeatherData.daily;
    const hourly = globalWeatherData.hourly;
    
    const dateObj = new Date(daily.time[dayIndex]);
    let dayName = daysRO[dateObj.getDay()];
    if (dayIndex === 0) dayName = "Astăzi";
    if (dayIndex === 1) dayName = "Mâine";
    
    document.getElementById('detail-day-name').innerText = dayName;
    document.getElementById('detail-date').innerText = `${dateObj.getDate()} ${monthsRO[dateObj.getMonth()]} ${dateObj.getFullYear()}`;
    
    const wInfo = getWeatherInterpretation(daily.weather_code[dayIndex], 1);
    document.getElementById('detail-main-icon').src = wInfo.iconUrl;
    document.getElementById('detail-main-desc').innerText = wInfo.desc;
    document.getElementById('detail-main-temps').innerText = `Min ${Math.round(daily.temperature_2m_min[dayIndex])}° / Max ${Math.round(daily.temperature_2m_max[dayIndex])}°`;

    document.getElementById('detail-rain').innerText = `${daily.precipitation_probability_max[dayIndex]}%`;
    document.getElementById('detail-uv').innerText = daily.uv_index_max[dayIndex].toFixed(1);
    document.getElementById('detail-wind').innerText = `${daily.wind_speed_10m_max[dayIndex]} km/h`;
    
    const sRise = new Date(daily.sunrise[dayIndex]).toLocaleTimeString('ro-RO', {hour: '2-digit', minute:'2-digit'});
    const sSet = new Date(daily.sunset[dayIndex]).toLocaleTimeString('ro-RO', {hour: '2-digit', minute:'2-digit'});
    document.getElementById('detail-sunrise').innerText = sRise;
    document.getElementById('detail-sunset').innerText = sSet;

    const hourlyContainer = document.getElementById('hourly-container');
    hourlyContainer.innerHTML = '';
    const startHourIndex = dayIndex * 24;
    
    for(let h = 0; h < 24; h++) {
        const index = startHourIndex + h;
        const hTemp = hourly.temperature_2m[index];
        const hCode = hourly.weather_code[index];
        const isDayHourly = hourly.is_day[index];
        
        const hInfo = getWeatherInterpretation(hCode, isDayHourly);
        const timeStr = h < 10 ? `0${h}:00` : `${h}:00`;
        
        hourlyContainer.innerHTML += `
            <div class="flex flex-col items-center justify-center min-w-[80px] p-4 bg-slate-800/80 rounded-xl border border-slate-700 shadow-sm">
                <span class="text-sm text-slate-400 mb-2 font-medium">${timeStr}</span>
                <img src="${hInfo.iconUrl}" class="w-12 h-12 drop-shadow-md mb-2" alt="Vreme">
                <span class="font-bold text-lg">${Math.round(hTemp)}°</span>
            </div>
        `;
    }

    showView('day-detail-view');
}

function getWeatherInterpretation(code, isDay = 1) {
    const timeSuffix = isDay ? '-day' : '-night';
    
    let desc = "Vreme normală";
    let iconName = "partly-cloudy" + timeSuffix;

    switch (code) {
        case 0: desc = "Cer senin"; iconName = "clear" + timeSuffix; break;
        case 1: desc = "Preponderent senin"; iconName = "partly-cloudy" + timeSuffix; break;
        case 2: desc = "Parțial înnorat"; iconName = "partly-cloudy" + timeSuffix; break;
        case 3: desc = "Înnorat"; iconName = "overcast"; break; 
        case 45: 
        case 48: desc = "Ceață"; iconName = "fog" + timeSuffix; break;
        case 51: 
        case 53: 
        case 55: desc = "Burniță"; iconName = "drizzle"; break;
        case 61: desc = "Ploaie ușoară"; iconName = "rain"; break;
        case 63: desc = "Ploaie moderată"; iconName = "rain"; break;
        case 65: desc = "Ploaie torențială"; iconName = "extreme-rain"; break;
        case 71: 
        case 73: desc = "Ninsoare"; iconName = "snow"; break;
        case 75: desc = "Ninsoare abundentă"; iconName = "extreme-snow"; break;
        case 95: desc = "Furtună"; iconName = "thunderstorms"; break;
        case 99: desc = "Grindină"; iconName = "thunderstorms-extreme-rain"; break;
        default: desc = "Vreme normală"; iconName = "partly-cloudy" + timeSuffix; break;
    }

    return {
        desc: desc,
        iconUrl: `https://cdn.jsdelivr.net/gh/basmilius/weather-icons/production/fill/all/${iconName}.svg`
    };
}

document.addEventListener('wheel', (e) => {
    const hourlyContainer = e.target.closest('.hourly-scroll');
    if (hourlyContainer) {
        e.preventDefault();
        hourlyContainer.scrollLeft += e.deltaY;
    }
}, { passive: false });

// ==========================================
// INTEGRARE CHATBOT VIA PHP
// ==========================================

const chatbotToggle = document.getElementById('chatbot-toggle');
const chatbotWindow = document.getElementById('chatbot-window');
const chatbotClose = document.getElementById('chatbot-close');
const chatbotInput = document.getElementById('chatbot-input');
const chatbotSend = document.getElementById('chatbot-send');
const chatbotMessages = document.getElementById('chatbot-messages');

chatbotToggle.addEventListener('click', () => {
    chatbotWindow.classList.toggle('hidden');
    lucide.createIcons(); 
});

chatbotClose.addEventListener('click', () => {
    chatbotWindow.classList.add('hidden');
});

const sendMessageToGemini = async () => {
    const userText = chatbotInput.value.trim();
    if (!userText) return;

    appendMessage(userText, 'user');
    chatbotInput.value = '';

    const typingId = appendMessage('Gândește...', 'bot');

    try {
        let systemPrompt = "Ești un asistent meteo prietenos. Răspunde scurt, la obiect și în limba română.";
        
        const cityName = document.getElementById('city-name-big').innerText;
        if (globalWeatherData && cityName !== 'Oraș') {
            const todayMin = Math.round(globalWeatherData.daily.temperature_2m_min[0]);
            const todayMax = Math.round(globalWeatherData.daily.temperature_2m_max[0]);
            const rainProb = globalWeatherData.daily.precipitation_probability_max[0];
            
            systemPrompt += ` Context curent pentru ${cityName}: Azi maxima este ${todayMax}°C, minima ${todayMin}°C, șanse ploaie ${rainProb}%.`;
        }

        const finalPrompt = `${systemPrompt}\n\nÎntrebarea: ${userText}`;

        const response = await fetch('api.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: finalPrompt })
        });

        const data = await response.json();
        removeMessage(typingId);

        if (data.candidates && data.candidates.length > 0) {
            const botReply = data.candidates[0].content.parts[0].text;
            appendMessage(botReply, 'bot');
        } else {
            appendMessage("Scuze, nu am putut genera un răspuns.", 'bot');
            console.error('Răspuns invalid:', data);
        }

    } catch (error) {
        console.error('Eroare Fetch spre PHP:', error);
        removeMessage(typingId);
        appendMessage('Eroare de conexiune cu serverul local.', 'bot');
    }
};

chatbotSend.addEventListener('click', sendMessageToGemini);
chatbotInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessageToGemini();
});

function appendMessage(text, sender) {
    const msgDiv = document.createElement('div');
    const id = 'msg-' + Date.now();
    msgDiv.id = id;
    
    if (sender === 'user') {
        msgDiv.className = 'bg-blue-600 text-white p-3 rounded-lg rounded-tr-none self-end max-w-[85%] shadow-md';
    } else {
        msgDiv.className = 'bg-slate-800 text-slate-200 p-3 rounded-lg rounded-tl-none self-start max-w-[85%] border border-slate-700 shadow-md';
    }
    
    msgDiv.innerHTML = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>'); 
    
    chatbotMessages.appendChild(msgDiv);
    chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
    return id;
}

function removeMessage(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
}