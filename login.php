<?php
ini_set('display_errors', 1);
error_reporting(E_ALL);

session_start();

$conn = new mysqli("localhost", "root", "", "trisha_dairy");

if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $email = trim($_POST['email']);
    $password = trim($_POST['password']);
    
    $stmt = $conn->prepare("SELECT id, user_name, password FROM users WHERE email = ?");
    $stmt->bind_param("s", $email);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows === 1) {
        $user = $result->fetch_assoc();
        
        if (password_verify($password, $user['password'])) {
            // Password correct: start session
            $_SESSION['user_id'] = $user['id'];
            $_SESSION['user_name'] = $user['user_name'];
            header("Location: index.html");
            exit;
        } else {
            echo "<h2>❌ Login Failed</h2>";
            echo "<p>Incorrect password. Please try again.</p>";
            echo "<a href='login.html'>← Back to Login</a>";
        }
    } else {
        echo "<h2>❌ User Not Found</h2>";
        echo "<p>No account found with this email address.</p>";
        echo "<p><a href='register.html'>Create an account</a> | <a href='login.html'>← Back to Login</a></p>";
    }

    $stmt->close();
} else {
    echo "<h2>No login data received</h2>";
    echo "<a href='login.html'>Go to login form</a>";
}

$conn->close();
?>
