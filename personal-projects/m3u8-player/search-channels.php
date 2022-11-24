<?php
// We need to use sessions, so you should always start sessions using the below code.
session_start();
// If the user is not logged in redirect to the login page...
if (!isset($_SESSION['loggedin'])) {
	header('Location: index.html');
	exit;
}
?>

<!DOCTYPE html>
<html>
	<head>
        <meta charset="utf-8">
        <title>m3u8 Player</title>
        <link rel="icon" type="image/x-icon" href="./assets/favicon.ico">
        <link type="text/css" rel="stylesheet" href="https://bootswatch.com/5/darkly/bootstrap.min.css">
        <script src="https://code.jquery.com/jquery-3.4.1.slim.min.js" integrity="sha384-J6qa4849blE2+poT4WnyKhv5vZF5SrPo0iEjwBvKU7imGFAV0wwj1yYfoRSJoZ+n" crossorigin="anonymous"></script>
        <script type="text/javascript" src="search.js"></script>  
	</head>
	<body>
		<div class="container">
            <h1 style="margin:auto;text-align:center;padding:70px;color:rgb(62,141,220)"> Search Channels Online</h1>
            <div class="text-center">
                <button class="btn btn-lg btn-outline-info" type="button" id="search-btn">Search</button>
            </div>
            <br>
            <div class="progress" style="width:50%;opacity:100;margin:auto">
                <div class="progress-bar progress-bar-striped progress-bar-animated" role="progressbar" style="width: 0%;" aria-valuenow="20" aria-valuemin="0" aria-valuemax="100", id="pbar"></div>
            </div>
            <br>
            <table class="table table-hover" style="margin:auto;text-align:center;width: 50%">
            <thead>
                <tr>
                <th scope="col">Live Channels</th>
                </tr>
            </thead>
            <tbody id="search-table">
                <!-- <tr class="table-active">
                </tr> -->
            </tbody>
            </table>


		</div>
	</body>
</html>


<!-- https://bootswatch.com/darkly/ -->
<!-- https://getbootstrap.com/docs/4.0/layout/grid/ -->