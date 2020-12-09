<?php
	$configs =  array(
		'OPENCAGE_API_KEY' => '688b3d4cf14f40ab9eed0a865b4a1d9d',
		'OPEN_EXCHANGE_RATES_API_KEY' => '76752690bb244907baac60e8cdadce7c',
		'OPENWEATHER_API_KEY' => '26e93c5ec4abe76207f910820d11c766',
		'GEONAMES_USERNAME' => 'arthur9',
		'NEWS_API' => '489383a1f0a647bc876947861625fa60'
	);
	
	$executionStartTime = microtime(true) / 1000;

	$url = null;
	$result = null;

	$resource = $_REQUEST['resource'];

	switch ($resource) {
		case 'geolocation':
			$lat = htmlspecialchars($_GET["lat"]);
			$lng = htmlspecialchars($_GET["lng"]);
			$url = 'https://api.opencagedata.com/geocode/v1/json?key=' . $configs['OPENCAGE_API_KEY'] . '&q=' . urlencode($lat . ',' . $lng) . '&prpetty=1&no_annocations=1';
			break;
		case 'boundary':
			$search = htmlspecialchars($_GET["search"]);
			$borderStr = file_get_contents("data/countryBorders.geo.json");
			$borders = json_decode($borderStr, true);
			foreach ($borders['features'] as $feature) {
				if ($feature['properties']['name'] === $search) {
					$result = $feature;
					break;
				}
			}
			break;
		case 'country':			
			$search = htmlspecialchars($_GET["search"]);
			$search = rtrim($search, '.');
			$url = 'https://restcountries.eu/rest/v2/name/' . rawurlencode($search);
			break;
		case 'exchange':
			$currencyCode = htmlspecialchars($_GET["currency"]);
			$url = 'https://openexchangerates.org/api/latest.json?app_id=' . $configs['OPEN_EXCHANGE_RATES_API_KEY'];
			break;
		case 'wikipedia':
			$search = htmlspecialchars($_GET["search"]);
  		$url = 'http://api.geonames.org/wikipediaSearchJSON?q=' . rawurlencode($search) . '&maxRows=1&username=' . $configs['GEONAMES_USERNAME'] . '&style=full';
			break;
		case 'news':
			$country = htmlspecialchars($_GET["country"]);
  		$url = 'http://newsapi.org/v2/top-headlines?country='. $country . '&apiKey=' . $configs['NEWS_API'];
			break;
		case 'weather':
			$lat = htmlspecialchars($_GET["lat"]);
  		$lng = htmlspecialchars($_GET["lng"]);
  		$url = 'http://api.openweathermap.org/data/2.5/weather?lat=' . $lat . '&lon=' . $lng . '&appid=' . $configs['OPENWEATHER_API_KEY'] . '&units=imperial';
			break;
	}
	
	if ($url) {
		$ch = curl_init();
		curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
		curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
		curl_setopt($ch, CURLOPT_URL,$url);
	
		$result = curl_exec($ch);
		$result = json_decode($result, true);

		curl_close($ch);
	}
	
	$output['status']['code'] = "200";
	$output['status']['name'] = "ok";
	$output['status']['description'] = "resource fetched";
	$output['status']['returnedIn'] = (microtime(true) - $executionStartTime) / 1000 . " ms";
	$output['data'] = $result;
	
	header('Content-Type: application/json; charset=UTF-8');

	echo json_encode($output); 
?>
