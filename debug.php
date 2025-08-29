<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);
header('Content-Type: text/plain');

echo "=== PHP Debug Info ===\n";
echo "PHP Version: " . phpversion() . "\n";
echo "SQLite3 Extension: " . (extension_loaded('sqlite3') ? 'YES' : 'NO') . "\n";
echo "Current Directory: " . __DIR__ . "\n";

$dbPath = __DIR__ . '/database/inventario.db';
$dbDir = dirname($dbPath);
echo "Database Directory: " . $dbDir . "\n";
echo "Database Path: " . $dbPath . "\n";
echo "Directory exists: " . (is_dir($dbDir) ? 'YES' : 'NO') . "\n";
echo "Directory writable: " . (is_writable($dbDir) || is_writable(__DIR__) ? 'YES' : 'NO') . "\n";

echo "\n=== Testing Database Connection ===\n";
try {
    if (!is_dir($dbDir)) {
        mkdir($dbDir, 0755, true);
        echo "Created database directory\n";
    }
    
    $db = new SQLite3($dbPath);
    echo "SQLite3 connection: SUCCESS\n";
    
    $result = $db->querySingle("SELECT sqlite_version()");
    echo "SQLite version: " . $result . "\n";
    
    $db->close();
} catch (Exception $e) {
    echo "Database error: " . $e->getMessage() . "\n";
}

echo "\n=== Testing Database Class ===\n";
try {
    require_once 'php/database.php';
    echo "Database class loaded: SUCCESS\n";
    
    $database = new Database();
    echo "Database class instantiated: SUCCESS\n";
    
    $stats = $database->getStats();
    echo "Stats retrieved: SUCCESS\n";
    echo "Stats data: " . print_r($stats, true) . "\n";
    
} catch (Exception $e) {
    echo "Database class error: " . $e->getMessage() . "\n";
}

echo "\n=== End Debug ===\n";
?>