<?php
error_reporting(0);
ini_set('display_errors', 0);

class Database {
    private $pdo;
    private $dbFile;
    
    public function __construct() {
        $this->dbFile = __DIR__ . '/../database/inventario.db';
        $this->initDatabase();
    }
    
    private function initDatabase() {
        try {
            // Create database directory if it doesn't exist
            $dbDir = dirname($this->dbFile);
            if (!is_dir($dbDir)) {
                mkdir($dbDir, 0755, true);
            }
            
            // Check if database exists
            $dbExists = file_exists($this->dbFile);
            
            // Create PDO connection
            $this->pdo = new PDO('sqlite:' . $this->dbFile);
            $this->pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            $this->pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
            
            // Enable foreign keys
            $this->pdo->exec('PRAGMA foreign_keys = ON');
            
            // If database doesn't exist, create schema and migrate data
            if (!$dbExists) {
                $this->createSchema();
                $this->migrateFromJSON();
            }
            
        } catch (PDOException $e) {
            throw new Exception('Database connection failed: ' . $e->getMessage());
        }
    }
    
    private function createSchema() {
        $schemaFile = __DIR__ . '/../database/schema.sql';
        if (!file_exists($schemaFile)) {
            throw new Exception('Schema file not found');
        }
        
        $schema = file_get_contents($schemaFile);
        $this->pdo->exec($schema);
    }
    
    private function migrateFromJSON() {
        $jsonFile = __DIR__ . '/../database/inventario.json';
        
        if (!file_exists($jsonFile)) {
            return; // No JSON file to migrate
        }
        
        $jsonData = json_decode(file_get_contents($jsonFile), true);
        
        if (!isset($jsonData['equipos']) || empty($jsonData['equipos'])) {
            return; // No data to migrate
        }
        
        // Get admin user ID for migration
        $stmt = $this->pdo->prepare('SELECT id FROM users WHERE role = "admin" LIMIT 1');
        $stmt->execute();
        $adminUser = $stmt->fetch();
        $adminUserId = $adminUser ? $adminUser['id'] : 1;
        
        // Migrate equipos to assets
        $stmt = $this->pdo->prepare('
            INSERT INTO assets (id, categoria, marca, serial, cantidad, ubicacion, created_by, created_at, updated_at) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ');
        
        foreach ($jsonData['equipos'] as $equipo) {
            $createdAt = isset($equipo['fecha_registro']) ? $equipo['fecha_registro'] : date('Y-m-d H:i:s');
            
            $stmt->execute([
                $equipo['id'],
                $equipo['categoria'],
                $equipo['marca'],
                $equipo['serial'],
                $equipo['cantidad'],
                $equipo['ubicacion'],
                $adminUserId,
                $createdAt,
                $createdAt
            ]);
        }
        
        // Update the auto-increment sequence
        if (isset($jsonData['next_id'])) {
            $this->pdo->exec("UPDATE sqlite_sequence SET seq = " . ($jsonData['next_id'] - 1) . " WHERE name = 'assets'");
        }
        
        // Rename JSON file as backup
        rename($jsonFile, $jsonFile . '.backup.' . date('Y-m-d-H-i-s'));
    }
    
    public function getPDO() {
        return $this->pdo;
    }
    
    // Asset management methods
    public function getAllAssets($search = '', $page = 1, $limit = 10) {
        $offset = ($page - 1) * $limit;
        
        $whereClause = '';
        $params = [];
        
        if (!empty($search)) {
            $whereClause = 'WHERE a.categoria LIKE ? OR a.marca LIKE ? OR a.serial LIKE ? OR a.ubicacion LIKE ? OR a.observaciones LIKE ?';
            $searchParam = '%' . $search . '%';
            $params = [$searchParam, $searchParam, $searchParam, $searchParam, $searchParam];
        }
        
        $sql = "
            SELECT a.*, u.full_name as created_by_name
            FROM assets a 
            LEFT JOIN users u ON a.created_by = u.id 
            $whereClause
            ORDER BY a.id ASC 
            LIMIT ? OFFSET ?
        ";
        
        $params[] = $limit;
        $params[] = $offset;
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        
        return $stmt->fetchAll();
    }
    
    public function getTotalAssets($search = '') {
        $whereClause = '';
        $params = [];
        
        if (!empty($search)) {
            $whereClause = 'WHERE categoria LIKE ? OR marca LIKE ? OR serial LIKE ? OR ubicacion LIKE ? OR observaciones LIKE ?';
            $searchParam = '%' . $search . '%';
            $params = [$searchParam, $searchParam, $searchParam, $searchParam, $searchParam];
        }
        
        $sql = "SELECT COUNT(*) as total FROM assets $whereClause";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        
        return $stmt->fetch()['total'];
    }
    
    // Legacy method for compatibility
    public function getAllEquipos() {
        return $this->getAllAssets();
    }
    
    public function getAssetById($id) {
        $stmt = $this->pdo->prepare('
            SELECT a.*, u.full_name as created_by_name
            FROM assets a 
            LEFT JOIN users u ON a.created_by = u.id 
            WHERE a.id = ?
        ');
        $stmt->execute([$id]);
        return $stmt->fetch();
    }
    
    // Legacy method for compatibility
    public function getEquipoById($id) {
        return $this->getAssetById($id);
    }
    
    public function addAsset($categoria, $marca, $serial, $cantidad, $ubicacion, $observaciones, $userId) {
        // Check if serial already exists
        $stmt = $this->pdo->prepare('SELECT id FROM assets WHERE serial = ?');
        $stmt->execute([$serial]);
        if ($stmt->fetch()) {
            throw new Exception('Serial ya existe');
        }
        
        $stmt = $this->pdo->prepare('
            INSERT INTO assets (categoria, marca, serial, cantidad, ubicacion, observaciones, condition_status, created_by) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ');
        
        $result = $stmt->execute([$categoria, $marca, $serial, (int)$cantidad, $ubicacion, $observaciones, 'Bueno', $userId]);
        
        if ($result) {
            $assetId = $this->pdo->lastInsertId();
            $this->logAuditAction($userId, 'CREATE', 'assets', $assetId, null, [
                'categoria' => $categoria,
                'marca' => $marca,
                'serial' => $serial,
                'cantidad' => $cantidad,
                'ubicacion' => $ubicacion,
                'observaciones' => $observaciones,
                'condition_status' => 'Bueno'
            ]);
            
            // Add initial status history
            $this->addStatusHistory($assetId, null, 'Bueno', $userId, 'Initial creation');
        }
        
        return $result;
    }
    
    // Legacy method for compatibility
    public function addEquipo($categoria, $marca, $serial, $cantidad, $ubicacion) {
        return $this->addAsset($categoria, $marca, $serial, $cantidad, $ubicacion, '', 1);
    }
    
    public function updateAsset($id, $categoria, $marca, $serial, $cantidad, $ubicacion, $observaciones, $userId) {
        // Get old values for audit log
        $oldAsset = $this->getAssetById($id);
        if (!$oldAsset) {
            throw new Exception('Asset not found');
        }
        
        // Check if serial exists in another record
        $stmt = $this->pdo->prepare('SELECT id FROM assets WHERE serial = ? AND id != ?');
        $stmt->execute([$serial, $id]);
        if ($stmt->fetch()) {
            throw new Exception('Serial ya existe en otro equipo');
        }
        
        $stmt = $this->pdo->prepare('
            UPDATE assets 
            SET categoria = ?, marca = ?, serial = ?, cantidad = ?, ubicacion = ?, observaciones = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        ');
        
        $result = $stmt->execute([$categoria, $marca, $serial, (int)$cantidad, $ubicacion, $observaciones, $id]);
        
        if ($result) {
            $this->logAuditAction($userId, 'UPDATE', 'assets', $id, $oldAsset, [
                'categoria' => $categoria,
                'marca' => $marca,
                'serial' => $serial,
                'cantidad' => $cantidad,
                'ubicacion' => $ubicacion,
                'observaciones' => $observaciones
            ]);
        }
        
        return $result;
    }
    
    // Legacy method for compatibility
    public function updateEquipo($id, $categoria, $marca, $serial, $cantidad, $ubicacion) {
        return $this->updateAsset($id, $categoria, $marca, $serial, $cantidad, $ubicacion, '', 1);
    }
    
    public function deleteAsset($id, $userId) {
        $oldAsset = $this->getAssetById($id);
        if (!$oldAsset) {
            return false;
        }
        
        $stmt = $this->pdo->prepare('DELETE FROM assets WHERE id = ?');
        $result = $stmt->execute([$id]);
        
        if ($result) {
            $this->logAuditAction($userId, 'DELETE', 'assets', $id, $oldAsset, null);
        }
        
        return $result;
    }
    
    // Legacy method for compatibility
    public function deleteEquipo($id) {
        return $this->deleteAsset($id, 1);
    }
    
    public function getStats() {
        $stats = [];
        
        // Total equipos (sum of cantidad)
        $stmt = $this->pdo->prepare('SELECT COALESCE(SUM(cantidad), 0) as total FROM assets WHERE status = "active"');
        $stmt->execute();
        $stats['total_equipos'] = $stmt->fetch()['total'];
        
        // Total categories
        $stmt = $this->pdo->prepare('SELECT COUNT(DISTINCT categoria) as total FROM assets WHERE status = "active"');
        $stmt->execute();
        $stats['total_categorias'] = $stmt->fetch()['total'];
        
        // Total locations
        $stmt = $this->pdo->prepare('SELECT COUNT(DISTINCT ubicacion) as total FROM assets WHERE status = "active"');
        $stmt->execute();
        $stats['total_ubicaciones'] = $stmt->fetch()['total'];
        
        // By category
        $stmt = $this->pdo->prepare('
            SELECT categoria, SUM(cantidad) as total 
            FROM assets 
            WHERE status = "active" 
            GROUP BY categoria 
            ORDER BY total DESC
        ');
        $stmt->execute();
        $stats['por_categoria'] = $stmt->fetchAll();
        
        // By location
        $stmt = $this->pdo->prepare('
            SELECT ubicacion, SUM(cantidad) as total 
            FROM assets 
            WHERE status = "active" 
            GROUP BY ubicacion 
            ORDER BY total DESC
        ');
        $stmt->execute();
        $stats['por_ubicacion'] = $stmt->fetchAll();
        
        return $stats;
    }
    
    // Status history methods
    public function addStatusHistory($assetId, $oldStatus, $newStatus, $userId, $reason = '') {
        $stmt = $this->pdo->prepare('
            INSERT INTO asset_status_history (asset_id, old_status, new_status, changed_by, change_reason) 
            VALUES (?, ?, ?, ?, ?)
        ');
        
        return $stmt->execute([$assetId, $oldStatus, $newStatus, $userId, $reason]);
    }
    
    public function updateAssetConditionStatus($assetId, $newConditionStatus, $userId, $reason = '') {
        // Get current asset data
        $asset = $this->getAssetById($assetId);
        if (!$asset) {
            throw new Exception('Asset not found');
        }
        
        $oldConditionStatus = $asset['condition_status'];
        
        // Update the condition status
        $stmt = $this->pdo->prepare('
            UPDATE assets 
            SET condition_status = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        ');
        
        $result = $stmt->execute([$newConditionStatus, $assetId]);
        
        if ($result) {
            // Log the change in audit log
            $this->logAuditAction($userId, 'UPDATE_STATUS', 'assets', $assetId, 
                ['condition_status' => $oldConditionStatus], 
                ['condition_status' => $newConditionStatus]
            );
            
            // Add to status history
            $this->addStatusHistory($assetId, $oldConditionStatus, $newConditionStatus, $userId, $reason);
        }
        
        return $result;
    }
    
    public function getAssetStatusHistory($assetId) {
        $stmt = $this->pdo->prepare('
            SELECT h.*, u.full_name as changed_by_name
            FROM asset_status_history h
            LEFT JOIN users u ON h.changed_by = u.id
            WHERE h.asset_id = ?
            ORDER BY h.created_at DESC
        ');
        $stmt->execute([$assetId]);
        return $stmt->fetchAll();
    }
    
    // Audit log methods
    public function logAuditAction($userId, $action, $tableName, $recordId, $oldValues, $newValues) {
        $stmt = $this->pdo->prepare('
            INSERT INTO audit_log (user_id, action, table_name, record_id, old_values, new_values, ip_address, user_agent) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ');
        
        $ipAddress = $_SERVER['REMOTE_ADDR'] ?? '';
        $userAgent = $_SERVER['HTTP_USER_AGENT'] ?? '';
        
        return $stmt->execute([
            $userId,
            $action,
            $tableName,
            $recordId,
            $oldValues ? json_encode($oldValues) : null,
            $newValues ? json_encode($newValues) : null,
            $ipAddress,
            $userAgent
        ]);
    }
    
    public function getAuditLog($limit = 100, $offset = 0) {
        $stmt = $this->pdo->prepare('
            SELECT a.*, u.full_name as user_name
            FROM audit_log a
            LEFT JOIN users u ON a.user_id = u.id
            ORDER BY a.created_at DESC
            LIMIT ? OFFSET ?
        ');
        $stmt->execute([$limit, $offset]);
        return $stmt->fetchAll();
    }
    
    public function getAuditLogEntry($id) {
        $stmt = $this->pdo->prepare('
            SELECT a.*, u.full_name as user_name
            FROM audit_log a
            LEFT JOIN users u ON a.user_id = u.id
            WHERE a.id = ?
        ');
        $stmt->execute([$id]);
        return $stmt->fetch();
    }
    
    // User management methods
    public function createUser($username, $password, $fullName, $email, $role = 'user') {
        $hashedPassword = password_hash($password, PASSWORD_DEFAULT);
        
        $stmt = $this->pdo->prepare('
            INSERT INTO users (username, password, full_name, email, role) 
            VALUES (?, ?, ?, ?, ?)
        ');
        
        return $stmt->execute([$username, $hashedPassword, $fullName, $email, $role]);
    }
    
    public function getUserByUsername($username) {
        $stmt = $this->pdo->prepare('SELECT * FROM users WHERE username = ? AND is_active = 1');
        $stmt->execute([$username]);
        return $stmt->fetch();
    }
    
    public function getUserById($id) {
        $stmt = $this->pdo->prepare('SELECT * FROM users WHERE id = ? AND is_active = 1');
        $stmt->execute([$id]);
        return $stmt->fetch();
    }
    
    public function verifyPassword($password, $hash) {
        return password_verify($password, $hash);
    }
    
    // Session management
    public function createSession($sessionId, $userId, $expiresAt) {
        $stmt = $this->pdo->prepare('
            INSERT OR REPLACE INTO user_sessions (id, user_id, ip_address, user_agent, expires_at) 
            VALUES (?, ?, ?, ?, ?)
        ');
        
        $ipAddress = $_SERVER['REMOTE_ADDR'] ?? '';
        $userAgent = $_SERVER['HTTP_USER_AGENT'] ?? '';
        
        return $stmt->execute([$sessionId, $userId, $ipAddress, $userAgent, $expiresAt]);
    }
    
    public function getSession($sessionId) {
        $stmt = $this->pdo->prepare('
            SELECT s.*, u.* 
            FROM user_sessions s
            JOIN users u ON s.user_id = u.id
            WHERE s.id = ? AND s.expires_at > CURRENT_TIMESTAMP AND u.is_active = 1
        ');
        $stmt->execute([$sessionId]);
        return $stmt->fetch();
    }
    
    public function deleteSession($sessionId) {
        $stmt = $this->pdo->prepare('DELETE FROM user_sessions WHERE id = ?');
        return $stmt->execute([$sessionId]);
    }
    
    public function cleanExpiredSessions() {
        $stmt = $this->pdo->prepare('DELETE FROM user_sessions WHERE expires_at <= CURRENT_TIMESTAMP');
        return $stmt->execute();
    }
}
?>