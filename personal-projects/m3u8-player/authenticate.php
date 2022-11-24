<?php
session_start();
// Change this to your connection info.
if ( !isset($_GET['search-placeholder']) ) {
	// Could not get the data that should have been sent.
	exit('Please enter a code');
}

$code = "9377868c155e345c2a5a15a5572ce887";

// Note: remember to use password_hash in your registration file to store the hashed passwords.
if ($_GET['search-placeholder'] === $code) {
    // Verification success! User has logged-in!
    // Create sessions, so we know the user is logged in, they basically act like cookies but remember the data on the server.
    session_regenerate_id();
    $_SESSION['loggedin'] = TRUE;
    $_SESSION['id'] = $id;
    header('Location: search-channels.php');
} else {
    // Incorrect password
    header('Location: index.html');
    exit;
}

?>