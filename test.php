$conn = new mysqli("localhost", "root", "", "trisha_dairy");
if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}
echo "Database connected successfully.";
