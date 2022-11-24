<?php
session_start();
// Change this to your connection info.
if ( !isset($_COOKIE['from-btn']) ) {
	// Could not get the data that should have been sent.
	exit('Please enter a code');
}

$code = "55337b1f-da16-4129-b9d6-5b35f144c811";

echo $_COOKIE['device-id'];

// Note: remember to use password_hash in your registration file to store the hashed passwords.
if ($_COOKIE['device-id'] === $code) {
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