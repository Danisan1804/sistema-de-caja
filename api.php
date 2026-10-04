<?php
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type');
header('Cache-Control: no-store');
require_once __DIR__ . '/config.php';

function response(int $status, array $data): never {
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function input(): array {
    $data = json_decode(file_get_contents('php://input'), true);
    return is_array($data) ? $data : [];
}

function requireInt(mixed $value, string $field): int {
    $number = filter_var($value, FILTER_VALIDATE_INT);
    if ($number === false || $number < 1) response(422, ['ok' => false, 'error' => "Campo inválido: {$field}"]);
    return (int)$number;
}

function order(PDO $pdo, int $id, bool $lock = false): array {
    $sql = 'SELECT * FROM pedidos WHERE id = ?' . ($lock ? ' FOR UPDATE' : '');
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$id]);
    $row = $stmt->fetch();
    if (!$row) response(404, ['ok' => false, 'error' => 'Pedido no encontrado']);
    $items = $pdo->prepare('SELECT id, producto_id, nombre_producto, precio_unitario, cantidad, instrucciones, agregado_en FROM pedido_items WHERE pedido_id = ? ORDER BY id');
    $items->execute([$id]);
    $row['id'] = (int)$row['id'];
    $row['total'] = (float)$row['total'];
    $row['items'] = $items->fetchAll();
    return $row;
}

function recalc(PDO $pdo, int $orderId): void {
    $stmt = $pdo->prepare('UPDATE pedidos SET total = (SELECT COALESCE(SUM(precio_unitario * cantidad), 0) FROM pedido_items WHERE pedido_id = ?) WHERE id = ?');
    $stmt->execute([$orderId, $orderId]);
}

function event(PDO $pdo, int $orderId, string $name, ?string $detail = null): void {
    $pdo->prepare('INSERT INTO pedido_eventos (pedido_id, evento, detalle) VALUES (?, ?, ?)')->execute([$orderId, $name, $detail]);
}

function extraPortions(mixed $extras): array {
    $allowed = ['Butifarra', 'Salchicha', 'Huevo', 'Papas', 'Carne picada'];
    if (!is_array($extras)) return [];
    $extras = array_values(array_unique(array_map('strval', $extras)));
    foreach ($extras as $extra) if (!in_array($extra, $allowed, true)) response(422, ['ok' => false, 'error' => 'Porción adicional inválida']);
    return $extras;
}

try {
    $pdo = db();
    $action = $_GET['action'] ?? '';
    $method = $_SERVER['REQUEST_METHOD'];
    $id = isset($_GET['id']) ? requireInt($_GET['id'], 'id') : null;

    if ($method === 'GET' && $action === 'productos') {
        $rows = $pdo->query('SELECT id, categoria_id, nombre, precio, precio_variable, disponible FROM productos WHERE disponible = 1 ORDER BY categoria_id, nombre')->fetchAll();
        response(200, ['ok' => true, 'data' => $rows]);
    }

    if ($method === 'GET' && $action === 'pedidos') {
        $page = max(1, (int)($_GET['pagina'] ?? 1));
        $limit = min(100, max(1, (int)($_GET['limite'] ?? 50)));
        $offset = ($page - 1) * $limit;
        $where = [];
        $params = [];
        if (isset($_GET['estado']) && $_GET['estado'] !== '') {
            $states = array_values(array_filter(array_map('trim', explode(',', (string)$_GET['estado']))));
            $states = array_values(array_filter($states, fn($s) => in_array($s, ['recibido','preparando','finalizado','cancelado'], true)));
            if ($states) { $where[] = 'estado IN (' . implode(',', array_fill(0, count($states), '?')) . ')'; $params = array_merge($params, $states); }
        }
        if (!empty($_GET['desde'])) { $where[] = 'creado_en >= ?'; $params[] = $_GET['desde'] . ' 00:00:00'; }
        if (!empty($_GET['hasta'])) { $where[] = 'creado_en < DATE_ADD(?, INTERVAL 1 DAY)'; $params[] = $_GET['hasta']; }
        $whereSql = $where ? ' WHERE ' . implode(' AND ', $where) : '';
        $count = $pdo->prepare('SELECT COUNT(*) FROM pedidos' . $whereSql); $count->execute($params); $totalRows = (int)$count->fetchColumn();
        $sort = strtolower((string)($_GET['orden'] ?? 'desc')) === 'asc' ? 'ASC' : 'DESC';
        $sql = 'SELECT id, estado, tipo_servicio, total, metodo_pago, pagado_en, creado_en, iniciado_en, finalizado_en FROM pedidos' . $whereSql . ' ORDER BY creado_en ' . $sort . ', id ' . $sort . ' LIMIT ' . $limit . ' OFFSET ' . $offset;
        $stmt = $pdo->prepare($sql); $stmt->execute($params);
        $orders = $stmt->fetchAll();
        $data = [];
        $ids = array_map(fn($row) => (int)$row['id'], $orders);
        $itemsByOrder = [];
        if ($ids) {
            $itemStmt = $pdo->prepare('SELECT id, pedido_id, producto_id, nombre_producto, precio_unitario, cantidad, instrucciones, agregado_en FROM pedido_items WHERE pedido_id IN (' . implode(',', array_fill(0, count($ids), '?')) . ') ORDER BY pedido_id, id');
            $itemStmt->execute($ids);
            foreach ($itemStmt->fetchAll() as $item) { $item['pedido_id'] = (int)$item['pedido_id']; $itemsByOrder[$item['pedido_id']][] = $item; }
        }
        $eventsByOrder = [];
        if (isset($_GET['eventos']) && $_GET['eventos'] === '1' && $ids) {
            $eventStmt = $pdo->prepare('SELECT id, pedido_id, evento, detalle, creado_en FROM pedido_eventos WHERE pedido_id IN (' . implode(',', array_fill(0, count($ids), '?')) . ') ORDER BY pedido_id, id');
            $eventStmt->execute($ids);
            foreach ($eventStmt->fetchAll() as $event) { $event['pedido_id'] = (int)$event['pedido_id']; $eventsByOrder[$event['pedido_id']][] = $event; }
        }
        foreach ($orders as $row) { $row['id'] = (int)$row['id']; $row['total'] = (float)$row['total']; $row['items'] = $itemsByOrder[$row['id']] ?? []; $row['eventos'] = $eventsByOrder[$row['id']] ?? []; $data[] = $row; }
        response(200, ['ok' => true, 'data' => $data, 'pagination' => ['pagina' => $page, 'limite' => $limit, 'total' => $totalRows, 'paginas' => (int)ceil($totalRows / $limit)]]);
    }

    if ($method === 'GET' && $action === 'pedido' && $id) response(200, ['ok' => true, 'data' => order($pdo, $id)]);

    if ($method === 'POST' && $action === 'pedidos') {
        $data = input();
        if (!isset($data['items']) || !is_array($data['items']) || !$data['items']) response(422, ['ok' => false, 'error' => 'El pedido debe tener productos']);
        $payment = (string)($data['metodo_pago'] ?? '');
        if (!in_array($payment, ['', 'efectivo', 'transferencia'], true)) response(422, ['ok' => false, 'error' => 'Método de pago inválido']);
        $pdo->beginTransaction();
        $pdo->exec("INSERT INTO pedidos (estado) VALUES ('recibido')");
        $orderId = (int)$pdo->lastInsertId();
        $service = (string)($data['tipo_servicio'] ?? 'aqui');
        if (!in_array($service, ['aqui', 'llevar'], true)) response(422, ['ok' => false, 'error' => 'Tipo de servicio inválido']);
        $pdo->prepare('UPDATE pedidos SET tipo_servicio = ?, metodo_pago = ?, pagado_en = CASE WHEN ? = \'\' THEN NULL ELSE NOW() END WHERE id = ?')->execute([$service, $payment ?: null, $payment, $orderId]);
        $item = $pdo->prepare('SELECT id, nombre, precio, precio_variable, disponible FROM productos WHERE id = ?');
        $insert = $pdo->prepare('INSERT INTO pedido_items (pedido_id, producto_id, nombre_producto, precio_unitario, cantidad, instrucciones) VALUES (?, ?, ?, ?, ?, ?)');
        foreach ($data['items'] as $raw) {
            $productId = requireInt($raw['producto_id'] ?? null, 'producto_id');
            $quantity = max(1, min(99, (int)($raw['cantidad'] ?? 1)));
            $item->execute([$productId]);
            $product = $item->fetch();
            if (!$product || !(int)$product['disponible']) response(409, ['ok' => false, 'error' => 'Producto no disponible']);
            $price = (float)($raw['precio'] ?? $product['precio']);
            if (!(int)$product['precio_variable']) $price = (float)$product['precio'];
            if ((int)$product['precio_variable'] && ($price < 10000 || $price > 100000)) response(422, ['ok' => false, 'error' => 'El precio debe estar entre $10.000 y $100.000']);
            $extras = extraPortions($raw['extras'] ?? []);
            $price += count($extras) * 5000;
            $instructions = trim((string)($raw['instrucciones'] ?? ''));
            if (mb_strlen($instructions) > 500) response(422, ['ok' => false, 'error' => 'Las instrucciones son demasiado largas']);
            $insert->execute([$orderId, $productId, $product['nombre'], $price, $quantity, $instructions ?: null]);
        }
        recalc($pdo, $orderId); event($pdo, $orderId, 'pedido_recibido'); if ($payment) event($pdo, $orderId, 'pago_registrado', $payment); $pdo->commit();
        response(201, ['ok' => true, 'data' => order($pdo, $orderId)]);
    }

    if ($method === 'POST' && $action === 'agregar-item' && $id) {
        $data = input(); $pdo->beginTransaction(); $current = order($pdo, $id, true);
        if (in_array($current['estado'], ['finalizado', 'cancelado'], true)) response(409, ['ok' => false, 'error' => 'El pedido ya no admite productos']);
        $productId = requireInt($data['producto_id'] ?? null, 'producto_id'); $quantity = max(1, min(99, (int)($data['cantidad'] ?? 1)));
        $p = $pdo->prepare('SELECT id, nombre, precio, precio_variable, disponible FROM productos WHERE id = ?'); $p->execute([$productId]); $product = $p->fetch();
        if (!$product || !(int)$product['disponible']) response(409, ['ok' => false, 'error' => 'Producto no disponible']);
        $price = (float)($data['precio'] ?? $product['precio']);
        if (!(int)$product['precio_variable']) $price = (float)$product['precio'];
        if ((int)$product['precio_variable'] && ($price < 10000 || $price > 100000)) response(422, ['ok' => false, 'error' => 'El precio debe estar entre $10.000 y $100.000']);
        $extras = extraPortions($data['extras'] ?? []);
        $price += count($extras) * 5000;
        $instructions = trim((string)($data['instrucciones'] ?? ''));
        if ($extras) $instructions = trim('Porciones aparte (+$5.000 c/u): ' . implode(', ', $extras) . ($instructions ? ' · ' . $instructions : ''));
        if (mb_strlen($instructions) > 500) response(422, ['ok' => false, 'error' => 'Las instrucciones son demasiado largas']);
        $pdo->prepare('INSERT INTO pedido_items (pedido_id, producto_id, nombre_producto, precio_unitario, cantidad, instrucciones) VALUES (?, ?, ?, ?, ?, ?)')->execute([$id, $productId, $product['nombre'], $price, $quantity, $instructions ?: null]);
        recalc($pdo, $id); event($pdo, $id, 'item_agregado'); $pdo->commit(); response(200, ['ok' => true, 'data' => order($pdo, $id)]);
    }

    if ($method === 'POST' && $action === 'agregar-porcion' && $id) {
        $data = input(); $itemId = requireInt($data['item_id'] ?? null, 'item_id');
        $portion = extraPortions([$data['porcion'] ?? ''])[0] ?? null;
        if (!$portion) response(422, ['ok' => false, 'error' => 'Porción inválida']);
        $pdo->beginTransaction(); $current = order($pdo, $id, true);
        if (in_array($current['estado'], ['finalizado', 'cancelado'], true)) response(409, ['ok' => false, 'error' => 'El pedido ya no admite cambios']);
        $item = $pdo->prepare('SELECT id, precio_unitario, instrucciones FROM pedido_items WHERE id = ? AND pedido_id = ? FOR UPDATE');
        $item->execute([$itemId, $id]); $row = $item->fetch();
        if (!$row) response(404, ['ok' => false, 'error' => 'Producto no encontrado en este pedido']);
        $instructions = trim((string)($row['instrucciones'] ?? ''));
        $instructions = trim($instructions ? $instructions . ' · Porción adicional: ' . $portion : 'Porción adicional: ' . $portion);
        $pdo->prepare('UPDATE pedido_items SET precio_unitario = precio_unitario + 5000, instrucciones = ? WHERE id = ?')->execute([$instructions, $itemId]);
        recalc($pdo, $id); event($pdo, $id, 'porcion_agregada', $portion); $pdo->commit(); response(200, ['ok' => true, 'data' => order($pdo, $id)]);
    }

    if ($method === 'PATCH' && $action === 'estado' && $id) {
        $status = (string)(input()['estado'] ?? '');
        $allowed = ['recibido', 'preparando', 'finalizado', 'cancelado'];
        if (!in_array($status, $allowed, true)) response(422, ['ok' => false, 'error' => 'Estado inválido']);
        $pdo->beginTransaction(); $current = order($pdo, $id, true);
        if ($current['estado'] === 'cancelado' || ($current['estado'] === 'finalizado' && $status !== 'finalizado')) response(409, ['ok' => false, 'error' => 'Transición de estado no permitida']);
        $times = $status === 'preparando' ? ', iniciado_en = NOW()' : ($status === 'finalizado' ? ', finalizado_en = NOW()' : '');
        $pdo->prepare("UPDATE pedidos SET estado = ?{$times} WHERE id = ?")->execute([$status, $id]);
        event($pdo, $id, 'estado_' . $status); $pdo->commit(); response(200, ['ok' => true, 'data' => order($pdo, $id)]);
    }

    if ($method === 'PATCH' && $action === 'pago' && $id) {
        $payment = (string)(input()['metodo_pago'] ?? '');
        if (!in_array($payment, ['efectivo', 'transferencia'], true)) response(422, ['ok' => false, 'error' => 'Método de pago inválido']);
        $paymentStmt = $pdo->prepare('UPDATE pedidos SET metodo_pago = ?, pagado_en = NOW() WHERE id = ? AND estado = ? AND metodo_pago IS NULL');
        $paymentStmt->execute([$payment, $id, 'finalizado']);
        if (!$paymentStmt->rowCount()) response(409, ['ok' => false, 'error' => 'El pedido debe estar finalizado y sin pago registrado']);
        event($pdo, $id, 'pago_registrado', $payment); response(200, ['ok' => true, 'data' => order($pdo, $id)]);
    }

    if ($method === 'GET' && $action === 'resumen') {
        $from = $_GET['desde'] ?? date('Y-m-d'); $to = $_GET['hasta'] ?? $from;
        $stmt = $pdo->prepare("SELECT COUNT(*) pedidos, COALESCE(SUM(CASE WHEN estado <> 'cancelado' THEN total ELSE 0 END),0) total, COALESCE(SUM(CASE WHEN estado <> 'cancelado' AND metodo_pago='efectivo' THEN total ELSE 0 END),0) efectivo, COALESCE(SUM(CASE WHEN estado <> 'cancelado' AND metodo_pago='transferencia' THEN total ELSE 0 END),0) transferencia, SUM(estado='cancelado') cancelados FROM pedidos WHERE creado_en >= ? AND creado_en < DATE_ADD(?, INTERVAL 1 DAY)");
        $stmt->execute([$from . ' 00:00:00', $to]);
        response(200, ['ok' => true, 'data' => $stmt->fetch()]);
    }

    response(404, ['ok' => false, 'error' => 'Ruta no encontrada']);
} catch (Throwable $e) {
    if (isset($pdo) && $pdo->inTransaction()) $pdo->rollBack();
    response(500, ['ok' => false, 'error' => 'Error interno del backend']);
}
