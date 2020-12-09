const apiUrl = '/api/api.php';
let latestGeoJson = null;
let mymap = null;

async function fetchGeolocation (lat, lng) {
    return axios.get(apiUrl, { params: { resource: 'geolocation', lat, lng } });
}

async function fetchCountryInfo (countryName) {
    return axios.get(apiUrl, { params: { resource: 'country', search: countryName }});
}

function fetchCurrencyExchange (currency) {
    return axios.get(apiUrl, { params: { resource: 'exchange', currency } });
}

function fetchWikipedia (countryName) {
    return axios.get(apiUrl, { params: { resource: 'wikipedia', search: countryName } });
}

function fetchWeather (lat, lng) {
    return axios.get(apiUrl, { params: { resource: 'weather', lat, lng } });
}

function fetchNews (country) {
    return axios.get(apiUrl, { params: { resource: 'news', country } });
}

function fetchBoundary (countryName) {
    // Clear current boundary
    if (latestGeoJson) {
        latestGeoJson.clearLayers();
    }

    // Fetch country boundary feature
    axios.get(apiUrl, { params: { resource: 'boundary', search: countryName } })
        .then(({data}) => {
            latestGeoJson = L.geoJSON(data.data, {
                onEachFeature: (feature, layer) => {
                    // Attach click event handler to layer
                    layer.on({ click: () => countryClicked(feature) });
                }
            }).addTo(mymap);
            mymap.fitBounds(latestGeoJson.getBounds());
        })
        .catch((error) => {
            console.log('error: ', error);
        })
};

function populateModalData (data) {
    const { country, currency, wikipedia, weather, news } = data

    if (country) {
        $('#country-modal .country-flag').attr('src', country.flag);
        $('#country-modal .country-name').text(country.name);
        $('#country-modal .country-latlng').text(`${country.latlng[0]}, ${country.latlng[1]}`);
        $('#country-modal .country-region').text(country.region);
        $('#country-modal .country-timezone').text(country.timezones.join(', '));
        $('#country-modal .country-capital').text(country.capital);
        $('#country-modal .country-population').text(country.population);
        $('#country-modal .country-currency').text(`${country.currencies[0].name} (${country.currencies[0].code})`);

        if (currency) {
            const currencyCode = country.currencies[0].code;
            if (currencyCode in currency.rates) {
                $('#country-modal .country-currency-exchange').text(`1 USD = ${currency.rates[currencyCode]} ${currencyCode}`);
            }
        }
        if (weather && weather.main) {
            $('#country-modal .country-temperature').html(`${weather.main.temp}&deg;F`)
            $('#country-modal .country-weather-description').html(weather.weather[0].description)
            $('#country-modal .country-weather-icon').attr('src', `http://openweathermap.org/img/w/${weather.weather[0].icon}.png`)
        }

        if (wikipedia && wikipedia.geonames) {
            $('#country-modal .country-wikipedia-url').attr('href', `http://${wikipedia.geonames[0].wikipediaUrl}`)
            $('#country-modal .country-wikipedia-url').text(wikipedia.geonames[0].wikipediaUrl)
        }

        if (news && news.articles && news.articles.length) {
            const topFiveArticles = news.articles.slice(0, 5);
            for (const article of topFiveArticles) {
                let articleItem = `<li class="mb-2"><p class="mb-0">${article.title}</p>`;
                if (article.description) {
                    articleItem += `<p class="mb-0"><small>${article.description}</small></p>`
                }
                if (article.url) {
                    articleItem += `<small><a href=${article.url} target="_blank">read more</a></small></li>`;
                }
                $('#country-modal .country-news-list').append(articleItem);
            }
        }
    }
}

function clearModalData () {
    $('#country-modal .country-flag').attr('src', '');
    $('#country-modal .country-name').text('...');
    $('#country-modal .country-latlng').text('-');
    $('#country-modal .country-region').text('-');
    $('#country-modal .country-timezone').text('-');
    $('#country-modal .country-capital').text('-');
    $('#country-modal .country-population').text('-');
    $('#country-modal .country-currency').text('-');
    $('#country-modal .country-currency-exchange').text('-');
    $('#country-modal .country-temperature').html('-');
    $('#country-modal .country-weather-description').html('-');
    $('#country-modal .country-weather-icon').attr('src', '');
    $('#country-modal .country-wikipedia-url').attr('href', '');
    $('#country-modal .country-wikipedia-url').text('-');
    $('#country-modal .country-news-list').empty();
}

function setLoading (val) {
    // Toggle loading section visibility
    if (val) {
        $('#country-modal .section-loading').addClass('d-flex');
        $('#country-modal .section-loading').removeClass('d-none');
        $('#country-modal .section-data').addClass('d-none');
    }
    else {
        $('#country-modal .section-loading').addClass('d-none');
        $('#country-modal .section-loading').removeClass('d-flex');
        $('#country-modal .section-data').removeClass('d-none');
    }
}

function isResponseSuccess (data) {
    return data && data.status && data.status.code === '200'
}

async function countryClicked (feature) {
    // Show loading section
    setLoading (true);

    // Clear existing modal data
    clearModalData();

    // Show modal
    $("#country-modal").modal();

    let data = {};

    try {
        // Fetch country information
        const { name } = feature.properties
        const { data: countryResult } = await fetchCountryInfo(name);
        if (isResponseSuccess(countryResult)) {
            data.country = countryResult.data[countryResult.data.length - 1];

            // Fetch currency exchange data
            try {
                const currency = data.country.currencies[0].code;
                const { data: exchangeResult } = await fetchCurrencyExchange(currency);
                if (isResponseSuccess(exchangeResult)) {
                    data.currency = exchangeResult.data;
                }
            }
            catch(error) {
                console.log('currency exchange error: ', error)
            }

            // Fetch weather data
            try {
                const { data: weatherResult } = await fetchWeather(data.country.latlng[0], data.country.latlng[1]);
                if (isResponseSuccess(weatherResult)) {
                    data.weather = weatherResult.data;
                }
            }
            catch(error) {
                console.log('weather data error: ', error)
            }
            
            // Fetch wikipedia data
            try {
                const { data: wikiResult } = await fetchWikipedia(name);
                if (isResponseSuccess(wikiResult)) {
                    data.wikipedia = wikiResult.data;
                }
            }
            catch(error) {
                console.log('wiki error: ', error)
            }

            // Fetch news data
            try {
                const { data: newsResult } = await fetchNews(data.country.alpha2Code.toLowerCase());
                if (isResponseSuccess(newsResult)) {
                    data.news = newsResult.data;
                }
            }
            catch(error) {
                console.log('news error: ', error)
            }
        }
        populateModalData(data);
        setLoading(false);
    }
    catch(error) {
        console.log('error: ', error);
    }
};

$(function() {
    // hide loader
    $('.loader').addClass('hidden');

    $('#select-country').change(function() {
        // Request for country boundary
        const countryName = $(this).val();
        fetchBoundary(countryName);
    });

    // Initialize map
    mymap = L.map('my-map').setView([50.5015, -0.02], 7);
    L.tileLayer('https://tile.jawg.io/jawg-streets/{z}/{x}/{y}.png?access-token=8ylar0mFu8qjfOjkoE0EE43LnGLBR3F8MuB9S4QuVl0Vw7lmQ5qyVaqRlKacMN5q', {}).addTo(mymap);
    mymap.attributionControl.addAttribution("<a href=\"https://www.jawg.io\" target=\"_blank\">&copy; Jawg</a> - <a href=\"https://www.openstreetmap.org\" target=\"_blank\">&copy; OpenStreetMap</a>&nbsp;contributors")

    // Get user's current location
    mymap.locate({
        setView: true,
        maxZoom: 7
    });

    mymap.on('locationfound', async (e) => {
        const radius = e.accuracy;
        L.circle(e.latlng, radius).addTo(mymap);

        try {
            const { data } = await fetchGeolocation(e.latlng.lat, e.latlng.lng);
            const result = data.data.results[0];
            if (result) {
                const countryName = result.components.country;
                fetchBoundary(countryName);

                L.marker(e.latlng)
                    .addTo(mymap)
                    .bindPopup("Hi, you are accessing from " + countryName)
                    .openPopup();
            }
        }
        catch(error) {
            console.log('error: ', error)
        }
    });

    mymap.on('locationerror', (e) => {
        alert(e.message);
    });
});
