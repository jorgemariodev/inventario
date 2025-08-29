class InventarioApp {
    constructor() {
        this.baseURL = './php/api.php';
        this.currentSection = 'dashboard';
        this.charts = {};
        this.dashboardLoaded = false;
        this.chartsCreated = false;
        this.currentUser = null;
        this.searchTerm = '';
        this.currentPage = 1;
        this.itemsPerPage = 10;
        this.totalItems = 0;
        this.init();
    }

    async init() {
        await this.checkAuthentication();
        this.setupEventListeners();
        this.loadDashboard();
    }
    
    async checkAuthentication() {
        try {
            const response = await fetch(`${this.baseURL}?action=check_auth`);
            const result = await response.json();
            
            if (!result.authenticated) {
                window.location.href = './login.html';
                return false;
            }
            
            this.currentUser = result.user;
            this.updateUserInterface();
            return true;
        } catch (error) {
            console.error('Authentication check failed:', error);
            window.location.href = './login.html';
            return false;
        }
    }
    
    updateUserInterface() {
        // Add user info to header if needed
        const header = document.querySelector('.header h2');
        if (header && this.currentUser) {
            const userInfo = document.createElement('div');
            userInfo.style.fontSize = '0.9em';
            userInfo.style.color = '#666';
            userInfo.textContent = `Bienvenido, ${this.currentUser.full_name}`;
            header.appendChild(userInfo);
        }
    }

    setupEventListeners() {
        document.querySelectorAll('.menu-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const section = e.target.getAttribute('href').replace('#', '');
                this.showSection(section);
                // Close mobile menu if open
                this.closeMobileMenu();
            });
        });

        const modal = document.getElementById('equipoModal');
        const closeBtn = document.querySelector('.close');
        const form = document.getElementById('equipoForm');

        closeBtn.addEventListener('click', () => this.closeModal());
        
        window.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.closeModal();
            }
        });

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveEquipo();
        });
        
        // Logout button
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.logout();
            });
        }
        
        // Search input enter key
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.addEventListener('keyup', (e) => {
                if (e.key === 'Enter') {
                    this.searchAssets();
                }
            });
        }

        // Mobile menu functionality
        const mobileMenuBtn = document.getElementById('mobile-menu-btn');
        const mobileOverlay = document.getElementById('mobile-overlay');
        const sidebar = document.querySelector('.sidebar');

        if (mobileMenuBtn) {
            mobileMenuBtn.addEventListener('click', () => {
                this.toggleMobileMenu();
            });
        }

        if (mobileOverlay) {
            mobileOverlay.addEventListener('click', () => {
                this.closeMobileMenu();
            });
        }

        // Close mobile menu on window resize
        window.addEventListener('resize', () => {
            if (window.innerWidth > 768) {
                this.closeMobileMenu();
            }
        });
    }

    showSection(section) {
        document.querySelectorAll('[id$="-section"]').forEach(sec => {
            sec.classList.add('hidden');
        });
        
        document.querySelectorAll('.menu-item').forEach(item => {
            item.classList.remove('active');
        });

        document.getElementById(`${section}-section`).classList.remove('hidden');
        document.querySelector(`[href="#${section}"]`).classList.add('active');

        this.currentSection = section;

        if (section === 'dashboard') {
            if (!this.dashboardLoaded || this.currentSection !== 'dashboard') {
                this.loadDashboard();
            }
        } else if (section === 'equipos') {
            this.loadEquipos();
        } else if (section === 'auditoria') {
            this.loadAuditLog();
        }
    }

    async loadDashboard() {
        if (this.dashboardLoaded) return;
        await this.refreshDashboard();
        this.dashboardLoaded = true;
    }

    async refreshDashboard() {
        // Debounce to prevent multiple rapid calls
        if (this.refreshing) return;
        this.refreshing = true;
        
        try {
            const response = await fetch(`${this.baseURL}?action=stats`);
            const stats = await response.json();

            document.getElementById('total-equipos').textContent = stats.total_equipos || 0;
            document.getElementById('total-categorias').textContent = stats.total_categorias || 0;
            document.getElementById('total-ubicaciones').textContent = stats.total_ubicaciones || 0;

            this.createCategoryChart(stats.por_categoria || []);
            this.createLocationChart(stats.por_ubicacion || []);
        } catch (error) {
            console.error('Error loading dashboard:', error);
        } finally {
            setTimeout(() => { this.refreshing = false; }, 100);
        }
    }

    createCategoryChart(data) {
        if (this.charts.category) {
            // Just update the data instead of recreating the chart
            this.charts.category.data.labels = data.map(item => item.categoria);
            this.charts.category.data.datasets[0].data = data.map(item => item.total);
            this.charts.category.update('none'); // Update without animation
            return;
        }

        const canvas = document.getElementById('categoryChart');
        if (!canvas) return;
        
        // Reset canvas size
        canvas.style.height = '200px';
        canvas.height = 200;
        
        const ctx = canvas.getContext('2d');

        this.charts.category = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: data.map(item => item.categoria),
                datasets: [{
                    data: data.map(item => item.total),
                    backgroundColor: [
                        '#6b7c32', '#8b9a52', '#a8b56b', '#4a5426', 
                        '#5a6b2a', '#6d7e35', '#7a8b42', '#87984f',
                        '#949f5c', '#a1a869', '#aeaf76', '#bbb683'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                },
                onResize: function() {
                    // Prevent infinite resize loops
                    return;
                }
            }
        });
    }

    createLocationChart(data) {
        if (this.charts.location) {
            // Just update the data instead of recreating the chart
            this.charts.location.data.labels = data.map(item => item.ubicacion);
            this.charts.location.data.datasets[0].data = data.map(item => item.total);
            this.charts.location.update('none'); // Update without animation
            return;
        }

        const canvas = document.getElementById('locationChart');
        if (!canvas) return;
        
        // Reset canvas size
        canvas.style.height = '200px';
        canvas.height = 200;
        
        const ctx = canvas.getContext('2d');

        this.charts.location = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.map(item => item.ubicacion),
                datasets: [{
                    label: 'Cantidad de Equipos',
                    data: data.map(item => item.total),
                    backgroundColor: '#6b7c32',
                    borderColor: '#4a5426',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: false,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                },
                onResize: function() {
                    // Prevent infinite resize loops
                    return;
                }
            }
        });
    }

    async loadEquipos() {
        try {
            const url = `${this.baseURL}?action=asset&search=${encodeURIComponent(this.searchTerm)}&page=${this.currentPage}&limit=${this.itemsPerPage}`;
            const response = await fetch(url);
            const result = await response.json();
            
            if (result.assets) {
                this.totalItems = result.total;
                this.renderEquiposTable(result.assets);
                this.renderPagination();
            } else {
                // Legacy fallback
                const equipos = result;
                this.renderEquiposTable(equipos);
            }
        } catch (error) {
            console.error('Error loading equipos:', error);
        }
    }
    
    searchAssets() {
        const searchInput = document.getElementById('search-input');
        this.searchTerm = searchInput ? searchInput.value : '';
        this.currentPage = 1;
        this.loadEquipos();
    }
    
    renderPagination() {
        const container = document.getElementById('pagination-container');
        if (!container) return;
        
        const totalPages = Math.ceil(this.totalItems / this.itemsPerPage);
        if (totalPages <= 1) {
            container.innerHTML = '';
            return;
        }
        
        let html = '';
        
        // Previous button
        html += `<button class="pagination-btn" ${this.currentPage === 1 ? 'disabled' : ''} onclick="app.goToPage(${this.currentPage - 1})">« Anterior</button>`;
        
        // Page info
        html += `<span class="pagination-info">Página ${this.currentPage} de ${totalPages} (${this.totalItems} registros)</span>`;
        
        // Next button
        html += `<button class="pagination-btn" ${this.currentPage === totalPages ? 'disabled' : ''} onclick="app.goToPage(${this.currentPage + 1})">Siguiente »</button>`;
        
        container.innerHTML = html;
    }
    
    goToPage(page) {
        if (page < 1 || page > Math.ceil(this.totalItems / this.itemsPerPage)) {
            return;
        }
        this.currentPage = page;
        this.loadEquipos();
    }

    renderEquiposTable(equipos) {
        const tbody = document.querySelector('#equipos-table tbody');
        tbody.innerHTML = '';

        equipos.forEach(equipo => {
            const row = document.createElement('tr');
            const observaciones = equipo.observaciones ? equipo.observaciones.substring(0, 50) + (equipo.observaciones.length > 50 ? '...' : '') : '';
            const conditionStatus = equipo.condition_status || 'Bueno';
            
            // Define status colors
            const statusColors = {
                'Bueno': 'success',
                'Perdido': 'warning', 
                'Dañado': 'danger',
                'De baja': 'secondary'
            };
            
            const statusClass = statusColors[conditionStatus] || 'secondary';
            
            row.innerHTML = `
                <td>${equipo.id}</td>
                <td>${equipo.categoria}</td>
                <td>${equipo.marca}</td>
                <td>${equipo.serial}</td>
                <td>${equipo.cantidad}</td>
                <td>${equipo.ubicacion}</td>
                <td>
                    <span class="status-badge status-${statusClass}" onclick="app.openStatusModal(${equipo.id})" title="Cambiar estado">
                        ${conditionStatus}
                    </span>
                </td>
                <td title="${equipo.observaciones || ''}">${observaciones}</td>
                <td>
                    <button class="btn btn-info" onclick="app.viewAssetHistory(${equipo.id})" title="Ver historial">📋</button>
                    <button class="btn btn-warning" onclick="app.editEquipo(${equipo.id})" title="Editar">✏️</button>
                    <button class="btn btn-danger" onclick="app.deleteEquipo(${equipo.id})" title="Eliminar">✖️</button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    openModal(action, equipoId = null) {
        const modal = document.getElementById('equipoModal');
        const title = document.getElementById('modal-title');
        const form = document.getElementById('equipoForm');

        if (action === 'add') {
            title.textContent = 'Agregar Equipo';
            form.reset();
            document.getElementById('equipo-id').value = '';
        } else if (action === 'edit' && equipoId) {
            title.textContent = 'Editar Equipo';
            this.loadEquipoForEdit(equipoId);
        }

        modal.style.display = 'block';
    }

    async loadEquipoForEdit(id) {
        try {
            const response = await fetch(`${this.baseURL}?action=asset&id=${id}`);
            const equipo = await response.json();

            document.getElementById('equipo-id').value = equipo.id;
            document.getElementById('categoria').value = equipo.categoria;
            document.getElementById('marca').value = equipo.marca;
            document.getElementById('serial').value = equipo.serial;
            document.getElementById('cantidad').value = equipo.cantidad;
            document.getElementById('ubicacion').value = equipo.ubicacion;
            document.getElementById('observaciones').value = equipo.observaciones || '';
        } catch (error) {
            console.error('Error loading equipo for edit:', error);
        }
    }

    closeModal() {
        document.getElementById('equipoModal').style.display = 'none';
    }

    async saveEquipo() {
        const id = document.getElementById('equipo-id').value;
        const data = {
            categoria: document.getElementById('categoria').value,
            marca: document.getElementById('marca').value,
            serial: document.getElementById('serial').value,
            cantidad: parseInt(document.getElementById('cantidad').value),
            ubicacion: document.getElementById('ubicacion').value,
            observaciones: document.getElementById('observaciones').value || ''
        };

        try {
            let response;
            if (id) {
                data.id = parseInt(id);
                response = await fetch(this.baseURL, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(data)
                });
            } else {
                response = await fetch(this.baseURL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(data)
                });
            }

            const result = await response.json();
            if (result.success) {
                this.closeModal();
                this.loadEquipos();
                this.refreshDashboard(); // Refresh dashboard stats
                this.showNotification('Equipo guardado exitosamente', 'success');
            } else {
                this.showNotification('Error al guardar equipo', 'error');
            }
        } catch (error) {
            console.error('Error saving equipo:', error);
            this.showNotification('Error al guardar equipo', 'error');
        }
    }

    async editEquipo(id) {
        this.openModal('edit', id);
    }

    async deleteEquipo(id) {
        if (confirm('¿Está seguro de eliminar este equipo?')) {
            try {
                const response = await fetch(`${this.baseURL}?id=${id}`, {
                    method: 'DELETE'
                });
                const result = await response.json();
                
                if (result.success) {
                    this.loadEquipos();
                    this.refreshDashboard(); // Refresh dashboard stats
                    this.showNotification('Equipo eliminado exitosamente', 'success');
                } else {
                    this.showNotification('Error al eliminar equipo', 'error');
                }
            } catch (error) {
                console.error('Error deleting equipo:', error);
                this.showNotification('Error al eliminar equipo', 'error');
            }
        }
    }

    async exportToExcel() {
        try {
            const response = await fetch(this.baseURL);
            const equipos = await response.json();
            
            // Prepare data for Excel
            const data = equipos.map(equipo => ({
                'ID': equipo.id,
                'Categoría': equipo.categoria,
                'Marca': equipo.marca,
                'Serial': equipo.serial,
                'Cantidad': equipo.cantidad,
                'Ubicación': equipo.ubicacion,
                'Fecha Registro': equipo.fecha_registro
            }));
            
            // Create workbook and worksheet
            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.json_to_sheet(data);
            
            // Auto-size columns
            const colWidths = [];
            const headers = Object.keys(data[0] || {});
            headers.forEach((header, i) => {
                const maxLength = Math.max(
                    header.length,
                    ...data.map(row => String(row[header] || '').length)
                );
                colWidths[i] = { wch: Math.min(maxLength + 2, 50) };
            });
            ws['!cols'] = colWidths;
            
            // Add worksheet to workbook
            XLSX.utils.book_append_sheet(wb, ws, 'Inventario');
            
            // Export file
            const fileName = `inventario_${new Date().toISOString().split('T')[0]}.xlsx`;
            XLSX.writeFile(wb, fileName);
            
            this.showNotification('Excel exportado exitosamente', 'success');
        } catch (error) {
            console.error('Error exporting to Excel:', error);
            this.showNotification('Error al exportar Excel', 'error');
        }
    }

    async exportToPDF() {
        try {
            const response = await fetch(this.baseURL);
            const equipos = await response.json();
            
            // Create PDF
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            
            // Title
            doc.setFontSize(18);
            doc.setTextColor(107, 124, 50); // Olive green color
            doc.text('Inventario de Equipos de Cómputo', 20, 25);
            
            doc.setFontSize(10);
            doc.setTextColor(100);
            doc.text(`Generado el: ${new Date().toLocaleDateString('es-ES')}`, 20, 35);
            
            // Prepare table data
            const tableData = equipos.map(equipo => [
                equipo.id,
                equipo.categoria,
                equipo.marca,
                equipo.serial,
                equipo.cantidad,
                equipo.ubicacion,
                new Date(equipo.fecha_registro).toLocaleDateString('es-ES')
            ]);
            
            // Create table
            doc.autoTable({
                startY: 45,
                head: [['ID', 'Categoría', 'Marca', 'Serial', 'Cantidad', 'Ubicación', 'Fecha Registro']],
                body: tableData,
                theme: 'striped',
                headStyles: {
                    fillColor: [107, 124, 50], // Olive green header
                    textColor: [255, 255, 255],
                    fontSize: 10
                },
                bodyStyles: {
                    fontSize: 9
                },
                columnStyles: {
                    0: { cellWidth: 15 },
                    1: { cellWidth: 30 },
                    2: { cellWidth: 25 },
                    3: { cellWidth: 25 },
                    4: { cellWidth: 20 },
                    5: { cellWidth: 35 },
                    6: { cellWidth: 30 }
                },
                margin: { top: 45, left: 10, right: 10 }
            });
            
            // Save PDF
            const fileName = `inventario_${new Date().toISOString().split('T')[0]}.pdf`;
            doc.save(fileName);
            
            this.showNotification('PDF exportado exitosamente', 'success');
        } catch (error) {
            console.error('Error exporting to PDF:', error);
            this.showNotification('Error al exportar PDF', 'error');
        }
    }

    showNotification(message, type) {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 5px;
            color: white;
            z-index: 9999;
            font-weight: bold;
            ${type === 'success' ? 'background-color: #4caf50;' : 'background-color: #f44336;'}
        `;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    toggleMobileMenu() {
        const sidebar = document.querySelector('.sidebar');
        const mobileBtn = document.getElementById('mobile-menu-btn');
        const overlay = document.getElementById('mobile-overlay');

        if (sidebar.classList.contains('open')) {
            this.closeMobileMenu();
        } else {
            this.openMobileMenu();
        }
    }

    openMobileMenu() {
        const sidebar = document.querySelector('.sidebar');
        const mobileBtn = document.getElementById('mobile-menu-btn');
        const overlay = document.getElementById('mobile-overlay');

        sidebar.classList.add('open');
        mobileBtn.classList.add('active');
        overlay.classList.add('show');
        document.body.style.overflow = 'hidden'; // Prevent scrolling
    }

    closeMobileMenu() {
        const sidebar = document.querySelector('.sidebar');
        const mobileBtn = document.getElementById('mobile-menu-btn');
        const overlay = document.getElementById('mobile-overlay');

        sidebar.classList.remove('open');
        mobileBtn.classList.remove('active');
        overlay.classList.remove('show');
        document.body.style.overflow = ''; // Restore scrolling
    }
    
    async logout() {
        try {
            const response = await fetch(`${this.baseURL}?action=logout`);
            const result = await response.json();
            
            if (result.success) {
                window.location.href = './login.html';
            } else {
                this.showNotification('Error al cerrar sesión', 'error');
            }
        } catch (error) {
            console.error('Error logging out:', error);
            // Force redirect even if logout request fails
            window.location.href = './login.html';
        }
    }
    
    async loadAuditLog() {
        try {
            const response = await fetch(`${this.baseURL}?action=audit_log`);
            const auditLog = await response.json();
            this.renderAuditTable(auditLog);
        } catch (error) {
            console.error('Error loading audit log:', error);
        }
    }
    
    renderAuditTable(auditLog) {
        const tbody = document.querySelector('#audit-table tbody');
        tbody.innerHTML = '';

        auditLog.forEach(entry => {
            const row = document.createElement('tr');
            const date = new Date(entry.created_at).toLocaleString('es-ES');
            
            row.innerHTML = `
                <td>${date}</td>
                <td>${entry.user_name || 'Sistema'}</td>
                <td>${entry.action}</td>
                <td>${entry.table_name}</td>
                <td>${entry.record_id || ''}</td>
                <td>
                    <button class="btn btn-info" onclick="app.viewAuditDetails('${entry.id}')">Ver</button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }
    
    async viewAuditDetails(entryId) {
        try {
            const response = await fetch(`${this.baseURL}?action=audit_detail&id=${entryId}`);
            const auditEntry = await response.json();
            
            if (auditEntry.error) {
                this.showNotification('No se pudo cargar el detalle', 'error');
                return;
            }
            
            this.showAuditDetailModal(auditEntry);
        } catch (error) {
            console.error('Error loading audit details:', error);
            this.showNotification('Error al cargar el detalle', 'error');
        }
    }
    
    showAuditDetailModal(auditEntry) {
        const modal = document.getElementById('auditDetailModal');
        const content = document.getElementById('audit-detail-content');
        
        const date = new Date(auditEntry.created_at).toLocaleString('es-ES');
        
        let oldValuesHtml = '';
        let newValuesHtml = '';
        
        if (auditEntry.old_values) {
            try {
                const oldValues = JSON.parse(auditEntry.old_values);
                oldValuesHtml = '<h4>Valores Anteriores:</h4><ul>';
                Object.keys(oldValues).forEach(key => {
                    oldValuesHtml += `<li><strong>${key}:</strong> ${oldValues[key]}</li>`;
                });
                oldValuesHtml += '</ul>';
            } catch (e) {
                oldValuesHtml = '<h4>Valores Anteriores:</h4><p>No disponible</p>';
            }
        }
        
        if (auditEntry.new_values) {
            try {
                const newValues = JSON.parse(auditEntry.new_values);
                newValuesHtml = '<h4>Valores Nuevos:</h4><ul>';
                Object.keys(newValues).forEach(key => {
                    newValuesHtml += `<li><strong>${key}:</strong> ${newValues[key]}</li>`;
                });
                newValuesHtml += '</ul>';
            } catch (e) {
                newValuesHtml = '<h4>Valores Nuevos:</h4><p>No disponible</p>';
            }
        }
        
        content.innerHTML = `
            <div class="audit-detail">
                <p><strong>Fecha:</strong> ${date}</p>
                <p><strong>Usuario:</strong> ${auditEntry.user_name || 'Sistema'}</p>
                <p><strong>Acción:</strong> ${auditEntry.action}</p>
                <p><strong>Tabla:</strong> ${auditEntry.table_name}</p>
                <p><strong>ID del Registro:</strong> ${auditEntry.record_id || 'N/A'}</p>
                <p><strong>IP:</strong> ${auditEntry.ip_address || 'N/A'}</p>
                <p><strong>User Agent:</strong> ${auditEntry.user_agent || 'N/A'}</p>
                <hr>
                ${oldValuesHtml}
                ${newValuesHtml}
            </div>
        `;
        
        modal.style.display = 'block';
    }
    
    async viewAssetHistory(assetId) {
        try {
            // Load asset info
            const assetResponse = await fetch(`${this.baseURL}?action=asset&id=${assetId}`);
            const asset = await assetResponse.json();
            
            if (asset.error) {
                this.showNotification('No se pudo cargar la información del activo', 'error');
                return;
            }
            
            // Load history
            const historyResponse = await fetch(`${this.baseURL}?action=asset_history&id=${assetId}`);
            const history = await historyResponse.json();
            
            this.showAssetHistoryModal(asset, history);
        } catch (error) {
            console.error('Error loading asset history:', error);
            this.showNotification('Error al cargar el historial', 'error');
        }
    }
    
    showAssetHistoryModal(asset, history) {
        const modal = document.getElementById('assetHistoryModal');
        const assetInfo = document.getElementById('asset-info');
        const historyContent = document.getElementById('asset-history-content');
        
        // Show asset information
        assetInfo.innerHTML = `
            <div class="asset-summary">
                <h4>${asset.categoria} - ${asset.marca}</h4>
                <p><strong>Serial:</strong> ${asset.serial}</p>
                <p><strong>Ubicación:</strong> ${asset.ubicacion}</p>
                <p><strong>Estado Actual:</strong> 
                    <span class="status-badge status-${this.getStatusClass(asset.condition_status)}">
                        ${asset.condition_status || 'Bueno'}
                    </span>
                </p>
            </div>
            <hr>
        `;
        
        // Show history
        let historyHtml = '<h4>Historial de Cambios:</h4>';
        
        if (history.length === 0) {
            historyHtml += '<p class="no-history">No hay historial de cambios disponible para este activo.</p>';
        } else {
            historyHtml += '<div class="history-timeline">';
            
            history.forEach(entry => {
                const date = new Date(entry.created_at).toLocaleString('es-ES');
                const oldStatusClass = this.getStatusClass(entry.old_status);
                const newStatusClass = this.getStatusClass(entry.new_status);
                
                historyHtml += `
                    <div class="history-entry">
                        <div class="history-date">${date}</div>
                        <div class="history-change">
                            <div class="status-change">
                                <span class="status-from status-${oldStatusClass}">${entry.old_status || 'N/A'}</span>
                                <span class="arrow">→</span>
                                <span class="status-to status-${newStatusClass}">${entry.new_status}</span>
                            </div>
                            <div class="changed-by">Modificado por: <strong>${entry.changed_by_name}</strong></div>
                            ${entry.change_reason ? `<div class="change-reason"><strong>Razón:</strong> ${entry.change_reason}</div>` : ''}
                        </div>
                    </div>
                `;
            });
            
            historyHtml += '</div>';
        }
        
        historyContent.innerHTML = historyHtml;
        modal.style.display = 'block';
    }
    
    getStatusClass(status) {
        const statusColors = {
            'Bueno': 'success',
            'Perdido': 'warning', 
            'Dañado': 'danger',
            'De baja': 'secondary'
        };
        return statusColors[status] || 'secondary';
    }
    
    async openStatusModal(assetId) {
        try {
            const response = await fetch(`${this.baseURL}?action=asset&id=${assetId}`);
            const asset = await response.json();
            
            if (asset.error) {
                this.showNotification('No se pudo cargar el activo', 'error');
                return;
            }
            
            const modal = document.getElementById('statusModal');
            document.getElementById('status-asset-info').textContent = 
                `${asset.categoria} - ${asset.marca} (${asset.serial})`;
            document.getElementById('current-status').value = asset.condition_status || 'Bueno';
            document.getElementById('new-status').value = '';
            document.getElementById('change-reason').value = '';
            
            // Store asset ID for later use
            this.currentAssetId = assetId;
            
            modal.style.display = 'block';
        } catch (error) {
            console.error('Error loading asset for status change:', error);
            this.showNotification('Error al cargar el activo', 'error');
        }
    }
    
    async saveStatusChange() {
        const newStatus = document.getElementById('new-status').value;
        const reason = document.getElementById('change-reason').value;
        
        if (!newStatus || !reason) {
            this.showNotification('Por favor complete todos los campos', 'error');
            return;
        }
        
        try {
            const response = await fetch(`${this.baseURL}?action=change_status`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    asset_id: this.currentAssetId,
                    new_status: newStatus,
                    reason: reason
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.showNotification('Estado actualizado exitosamente', 'success');
                this.closeStatusModal();
                this.loadEquipos(); // Reload the table to show updated status
            } else {
                this.showNotification(result.error || 'Error al actualizar el estado', 'error');
            }
        } catch (error) {
            console.error('Error updating status:', error);
            this.showNotification('Error al actualizar el estado', 'error');
        }
    }
    
    closeStatusModal() {
        document.getElementById('statusModal').style.display = 'none';
        this.currentAssetId = null;
    }
}

// Global functions for onclick events
function openModal(action, equipoId = null) {
    app.openModal(action, equipoId);
}

function closeModal() {
    app.closeModal();
}

function viewAssetHistory(assetId) {
    app.viewAssetHistory(assetId);
}

function closeStatusModal() {
    app.closeStatusModal();
}

function closeAuditDetailModal() {
    document.getElementById('auditDetailModal').style.display = 'none';
}

function closeAssetHistoryModal() {
    document.getElementById('assetHistoryModal').style.display = 'none';
}

// Initialize app
const app = new InventarioApp();

// Make app globally available for debugging
window.app = app;