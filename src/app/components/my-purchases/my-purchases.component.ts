import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import {
    PurchaseIntentionsService,
    PurchaseIntention,
    PurchaseIntentionsResponse
} from '../../core/services/purchase-intentions.service';
import { ToastService } from '../../core/services/toast.service';
import { CancelIntentionDialogComponent } from '../cancel-intention-dialog/cancel-intention-dialog.component';

@Component({
    selector: 'app-my-purchases',
    templateUrl: './my-purchases.component.html',
    styleUrls: ['./my-purchases.component.scss']
})
export class MyPurchasesComponent implements OnInit {
    intentions: PurchaseIntention[] = [];
    isLoading = true;

    // Pagination
    page = 1;
    pageSize = 10;
    totalIntentions = 0;
    totalPages = 0;

    // Filters
    selectedStatus = 'all';
    statusOptions = [
        { value: 'all', label: 'Todos' },
        { value: 'pending', label: 'Pendiente' },
        { value: 'verified', label: 'Verificado' },
        { value: 'rejected', label: 'Rechazado' },
        { value: 'contacted', label: 'Contactado' },
        { value: 'in_negotiation', label: 'En negociación' },
        { value: 'completed', label: 'Completado' },
        { value: 'cancelled', label: 'Cancelado' }
    ];

    constructor(
        private purchaseIntentionsService: PurchaseIntentionsService,
        private toastService: ToastService,
        private router: Router,
        private dialog: MatDialog
    ) { }

    ngOnInit(): void {
        this.loadPurchases();
    }

    loadPurchases(): void {
        this.isLoading = true;

        const status = this.selectedStatus === 'all' ? undefined : this.selectedStatus;

        this.purchaseIntentionsService.getMyPurchases(this.page, this.pageSize, status).subscribe({
            next: (response: PurchaseIntentionsResponse) => {
                this.intentions = response.intentions || [];
                this.totalIntentions = response.total || 0;
                this.totalPages = response.total_pages || 0;
                this.isLoading = false;
            },
            error: (error: any) => {
                console.error('Error loading purchases:', error);
                this.toastService.showError('Error al cargar tus compras', 'Error');
                this.isLoading = false;
            }
        });
    }

    onStatusFilterChange(): void {
        this.page = 1; // Reset to first page when filtering
        this.loadPurchases();
    }

    goToPage(page: number): void {
        if (page >= 1 && page <= this.totalPages) {
            this.page = page;
            this.loadPurchases();
        }
    }

    nextPage(): void {
        if (this.page < this.totalPages) {
            this.page++;
            this.loadPurchases();
        }
    }

    previousPage(): void {
        if (this.page > 1) {
            this.page--;
            this.loadPurchases();
        }
    }

    viewProductDetail(productId: string): void {
        this.router.navigate(['/product-detail', productId]);
    }

    getStatusLabel(status: string): string {
        const option = this.statusOptions.find(opt => opt.value === status);
        return option ? option.label : status;
    }

    getStatusClass(status: string): string {
        const statusClasses: { [key: string]: string } = {
            'pending': 'status-pending',
            'verified': 'status-verified',
            'rejected': 'status-rejected',
            'contacted': 'status-contacted',
            'in_negotiation': 'status-negotiation',
            'completed': 'status-completed',
            'cancelled': 'status-cancelled'
        };
        return statusClasses[status] || 'status-default';
    }

    getInquiryTypeLabel(type: string): string {
        const types: { [key: string]: string } = {
            'general': 'Consulta general',
            'price': 'Consulta de precio',
            'availability': 'Disponibilidad',
            'technical': 'Consulta técnica',
            'logistics': 'Logística'
        };
        return types[type] || type;
    }

    formatPrice(price?: number): string {
        if (!price) return 'N/A';
        return new Intl.NumberFormat('es-AR', {
            style: 'currency',
            currency: 'ARS',
            minimumFractionDigits: 0
        }).format(price);
    }

    formatDate(dateString?: string): string {
        if (!dateString) return 'N/A';
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('es-AR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch {
            return 'N/A';
        }
    }

    getCategoryIcon(category?: string): string {
        const icons: { [key: string]: string } = {
            'transport': 'local_shipping',
            'livestock': 'pets',
            'supplies': 'agriculture'
        };
        return icons[category || ''] || 'shopping_bag';
    }

    cancelIntention(intention: PurchaseIntention): void {
        const dialogRef = this.dialog.open(CancelIntentionDialogComponent, {
            width: '600px',
            maxWidth: '90vw',
            data: {
                productTitle: intention.product_title
            },
            disableClose: false,
            autoFocus: true
        });

        dialogRef.afterClosed().subscribe(result => {
            if (result && result.confirmed) {
                this.purchaseIntentionsService.cancelIntention(intention.id, result.reason).subscribe({
                    next: () => {
                        this.toastService.showSuccess('Consulta cancelada exitosamente', 'Cancelado');
                        this.loadPurchases();
                    },
                    error: (error: any) => {
                        console.error('Error cancelling intention:', error);
                        this.toastService.showError('Error al cancelar la consulta', 'Error');
                    }
                });
            }
        });
    }

    canUpdateStatus(status: string): boolean {
        // Allow updating status for non-cancelled states
        // Completed can be set by user to mark their own purchase as done
        return status !== 'cancelled' && status !== 'rejected';
    }

    getAvailableStatuses(currentStatus: string): Array<{ value: string, label: string }> {
        // Define allowed transitions based on current status
        const statusTransitions: { [key: string]: string[] } = {
            'pending': ['pending', 'in_negotiation', 'completed'],
            'verified': ['verified', 'in_negotiation', 'completed'],
            'contacted': ['contacted', 'in_negotiation', 'completed'],
            'in_negotiation': ['in_negotiation', 'pending', 'contacted', 'completed'],
            'completed': ['completed', 'in_negotiation'] // Allow reopening if needed
        };

        const allowed = statusTransitions[currentStatus] || [currentStatus];

        return this.statusOptions.filter(opt =>
            allowed.includes(opt.value) && opt.value !== 'all' && opt.value !== 'cancelled' && opt.value !== 'rejected'
        );
    }

    onStatusChange(intention: PurchaseIntention, newStatus: string): void {
        if (newStatus === intention.status) {
            return; // No change
        }

        this.purchaseIntentionsService.updateIntentionStatus(intention.id, newStatus).subscribe({
            next: (response) => {
                this.toastService.showSuccess(`Estado actualizado a: ${this.getStatusLabel(newStatus)}`, 'Actualizado');
                // Update local state
                intention.status = newStatus;
            },
            error: (error: any) => {
                console.error('Error updating status:', error);
                this.toastService.showError(
                    error.error?.details || 'No se pudo actualizar el estado',
                    'Error'
                );
                // Reload to restore correct state
                this.loadPurchases();
            }
        });
    }
}