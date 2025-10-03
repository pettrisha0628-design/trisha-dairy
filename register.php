<?php
ini_set('display_errors', 1);
error_reporting(E_ALL);

session_start();

$conn = new mysqli("localhost", "root", "", "trisha_dairy");

if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $firstname = trim($_POST['firstname']);
    $lastname = trim($_POST['lastname']);
    $email = trim($_POST['email']);
    $phone = trim($_POST['phone']);
    $city = trim($_POST['city']);
    $password = trim($_POST['password']);
    $confirm_password = trim($_POST['confirm_password']);
    
    if ($password !== $confirm_password) {
        echo "<h3>Error: Passwords do not match!</h3>";
        echo "<a href='register.html'>← Go back to register</a>";
        exit;
    }

    $username = $firstname . " " . $lastname;
    $hashed_password = password_hash($password, PASSWORD_DEFAULT);

    // Use prepared statements
    $stmt = $conn->prepare("INSERT INTO users (user_name, email, password, phone, city) VALUES (?, ?, ?, ?, ?)");
    $stmt->bind_param("sssss", $username, $email, $hashed_password, $phone, $city);

    if ($stmt->execute()) {
        echo "<h3>🎉 Registration Successful!</h3>";
        echo "<p>Welcome to Trisha's Dairy, " . htmlspecialchars($username) . "!</p>";
        echo "<p>Your account has been created successfully.</p>";
        echo "<a href='login.html'>Click here to login</a> | ";
        echo "<a href='index.html'>Go to Homepage</a>";
    } else {
        echo "<h3>Registration Failed</h3>";
        echo "<p>Error: " . $conn->error . "</p>";
        echo "<a href='register.html'>← Try registering again</a>";
    }

    $stmt->close();
} else {
    echo "<h3>No form data received</h3>";
    echo "<a href='register.html'>← Go to registration form</a>";
}

$conn->close();
?>
