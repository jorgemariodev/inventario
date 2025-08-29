<?php
session_start();
error_reporting(0);
ini_set('display_errors', 0);
ini_set('log_errors', 1);

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    exit(0);
}

try {
    require_once 'database.php';
} catch (Exception $e) {
    echo json_encode(['error' => 'Database connection failed: ' . $e->getMessage()]);
    exit;
}

try {
    $database = new Database();
    $method = $_SERVER['REQUEST_METHOD'];
    $input = json_decode(file_get_contents('php://input'), true);
    
    // Check authentication for protected routes
    $publicRoutes = ['login', 'logout', 'check_auth'];
    $action = $_GET['action'] ?? '';
    
    if (!in_array($action, $publicRoutes) && !isAuthenticated($database)) {
        http_response_code(401);
        echo json_encode(['error' => 'Authentication required']);
        exit;
    }

    switch ($method) {
    case 'GET':
        if (isset($_GET['action'])) {
            switch ($_GET['action']) {
                case 'login':
                    // Login form data - no action needed for GET
                    echo json_encode(['message' => 'Login form']);
                    break;
                    
                case 'logout':
                    logout($database);
                    echo json_encode(['success' => true, 'message' => 'Logged out successfully']);
                    break;
                    
                case 'check_auth':
                    $user = getCurrentUser($database);
                    if ($user) {
                        echo json_encode(['authenticated' => true, 'user' => $user]);
                    } else {
                        echo json_encode(['authenticated' => false]);
                    }
                    break;
                    
                case 'stats':
                    echo json_encode($database->getStats());
                    break;
                    
                case 'asset':
                    if (isset($_GET['id'])) {
                        $result = $database->getAssetById($_GET['id']);
                        echo json_encode($result ? $result : ['error' => 'Asset no encontrado']);
                    } else {
                        $search = $_GET['search'] ?? '';
                        $page = (int)($_GET['page'] ?? 1);
                        $limit = (int)($_GET['limit'] ?? 10);
                        
                        $assets = $database->getAllAssets($search, $page, $limit);
                        $total = $database->getTotalAssets($search);
                        
                        echo json_encode([
                            'assets' => $assets,
                            'total' => $total,
                            'page' => $page,
                            'limit' => $limit,
                            'totalPages' => ceil($total / $limit)
                        ]);
                    }
                    break;
                    
                case 'asset_history':
                    if (isset($_GET['id'])) {
                        $history = $database->getAssetStatusHistory($_GET['id']);
                        echo json_encode($history);
                    } else {
                        echo json_encode(['error' => 'Asset ID required']);
                    }
                    break;
                    
                case 'audit_log':
                    $limit = (int)($_GET['limit'] ?? 50);
                    $offset = (int)($_GET['offset'] ?? 0);
                    $auditLog = $database->getAuditLog($limit, $offset);
                    echo json_encode($auditLog);
                    break;
                    
                case 'audit_detail':
                    if (isset($_GET['id'])) {
                        $auditEntry = $database->getAuditLogEntry($_GET['id']);
                        echo json_encode($auditEntry ? $auditEntry : ['error' => 'Audit entry not found']);
                    } else {
                        echo json_encode(['error' => 'Audit entry ID required']);
                    }
                    break;
                    
                case 'equipo':
                    if (isset($_GET['id'])) {
                        echo json_encode($database->getEquipoById($_GET['id']));
                    } else {
                        echo json_encode($database->getAllEquipos());
                    }
                    break;
                    
                default:
                    echo json_encode($database->getAllEquipos());
            }
        } else {
            echo json_encode($database->getAllEquipos());
        }
        break;
    
    case 'POST':
        if (isset($_GET['action']) && $_GET['action'] === 'login') {
            // Handle login
            if (!isset($input['username']) || !isset($input['password'])) {
                echo json_encode(['success' => false, 'error' => 'Username and password required']);
                break;
            }
            
            $user = $database->getUserByUsername($input['username']);
            if ($user && $database->verifyPassword($input['password'], $user['password'])) {
                // Create session
                $sessionId = bin2hex(random_bytes(32));
                $expiresAt = date('Y-m-d H:i:s', strtotime('+24 hours'));
                
                $database->createSession($sessionId, $user['id'], $expiresAt);
                $_SESSION['session_id'] = $sessionId;
                
                echo json_encode([
                    'success' => true, 
                    'message' => 'Login successful',
                    'user' => [
                        'id' => $user['id'],
                        'username' => $user['username'],
                        'full_name' => $user['full_name'],
                        'role' => $user['role']
                    ]
                ]);
            } else {
                echo json_encode(['success' => false, 'error' => 'Invalid credentials']);
            }
        } elseif (isset($_GET['action']) && $_GET['action'] === 'change_status') {
            // Handle status change
            $user = getCurrentUser($database);
            if (!$user) {
                http_response_code(401);
                echo json_encode(['success' => false, 'error' => 'Authentication required']);
                break;
            }
            
            if (isset($input['asset_id']) && isset($input['new_status']) && isset($input['reason'])) {
                try {
                    $result = $database->updateAssetConditionStatus(
                        $input['asset_id'],
                        $input['new_status'],
                        $user['id'],
                        $input['reason']
                    );
                    echo json_encode(['success' => $result]);
                } catch (Exception $e) {
                    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
                }
            } else {
                echo json_encode(['success' => false, 'error' => 'Asset ID, new status, and reason required']);
            }
        } else {
            // Handle asset creation
            $user = getCurrentUser($database);
            if (!$user) {
                http_response_code(401);
                echo json_encode(['success' => false, 'error' => 'Authentication required']);
                break;
            }
            
            if (isset($input['categoria']) && isset($input['marca']) && isset($input['serial']) && 
                isset($input['cantidad']) && isset($input['ubicacion'])) {
                try {
                    $observaciones = $input['observaciones'] ?? '';
                    $result = $database->addAsset(
                        $input['categoria'],
                        $input['marca'],
                        $input['serial'],
                        $input['cantidad'],
                        $input['ubicacion'],
                        $observaciones,
                        $user['id']
                    );
                    echo json_encode(['success' => $result]);
                } catch (Exception $e) {
                    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
                }
            } else {
                echo json_encode(['success' => false, 'error' => 'Datos incompletos']);
            }
        }
        break;
    
    case 'PUT':
        $user = getCurrentUser($database);
        if (!$user) {
            http_response_code(401);
            echo json_encode(['success' => false, 'error' => 'Authentication required']);
            break;
        }
        
        if (isset($input['id']) && isset($input['categoria']) && isset($input['marca']) && 
            isset($input['serial']) && isset($input['cantidad']) && isset($input['ubicacion'])) {
            try {
                $observaciones = $input['observaciones'] ?? '';
                $result = $database->updateAsset(
                    $input['id'],
                    $input['categoria'],
                    $input['marca'],
                    $input['serial'],
                    $input['cantidad'],
                    $input['ubicacion'],
                    $observaciones,
                    $user['id']
                );
                echo json_encode(['success' => $result]);
            } catch (Exception $e) {
                echo json_encode(['success' => false, 'error' => $e->getMessage()]);
            }
        } else {
            echo json_encode(['success' => false, 'error' => 'Datos incompletos']);
        }
        break;
    
    case 'DELETE':
        $user = getCurrentUser($database);
        if (!$user) {
            http_response_code(401);
            echo json_encode(['success' => false, 'error' => 'Authentication required']);
            break;
        }
        
        if (isset($_GET['id'])) {
            $result = $database->deleteAsset($_GET['id'], $user['id']);
            echo json_encode(['success' => $result]);
        } else {
            echo json_encode(['success' => false, 'error' => 'ID requerido']);
        }
        break;
    
    default:
        echo json_encode(['error' => 'Método no permitido']);
        break;
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'error' => true,
        'message' => $e->getMessage()
    ]);
}

// Helper functions
function isAuthenticated($database) {
    if (!isset($_SESSION['session_id'])) {
        return false;
    }
    
    $session = $database->getSession($_SESSION['session_id']);
    return $session !== false;
}

function getCurrentUser($database) {
    if (!isset($_SESSION['session_id'])) {
        return false;
    }
    
    $session = $database->getSession($_SESSION['session_id']);
    if (!$session) {
        return false;
    }
    
    return [
        'id' => $session['user_id'],
        'username' => $session['username'],
        'full_name' => $session['full_name'],
        'role' => $session['role'],
        'email' => $session['email']
    ];
}

function logout($database) {
    if (isset($_SESSION['session_id'])) {
        $database->deleteSession($_SESSION['session_id']);
        unset($_SESSION['session_id']);
    }
    session_destroy();
}
?>