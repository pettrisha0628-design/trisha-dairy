<?php
$conn = new mysqli("localhost", "root", "", "trisha_dairy");

if ($conn->connect_error) {
    echo "Connection failed: " . $conn->connect_error;
} else {
    echo "Database connected successfully!";
}

$conn->close();
?>
