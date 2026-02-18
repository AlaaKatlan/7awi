import { Component, inject, computed, signal, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService } from '../../services/data.service';
import { DimClient } from '../../models/data.models';

// Declare flatpickr for TypeScript
declare var flatpickr: any;

@Component({
  selector: 'app-client-manager',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './client-manager.component.html'
})
export class ClientManagerComponent implements AfterViewInit, OnDestroy {
  dataService = inject(DataService);

  // View State
  currentView = signal<'list' | 'form'>('list');
  
  // Filters
  searchText = signal('');
  filterCountry = signal('ALL');
  filterStatus = signal('ALL');
  filterIndustry = signal('ALL');
  saving = signal(false);

  showDeleteModal = false;
  isEditMode = false;
  clientToDelete: DimClient | null = null;
  filterProduct = signal<number | null>(null);

  currentClient: DimClient = this.getEmptyClient();

  // Flatpickr instances
  private flatpickrInstances: any[] = [];

  // Dropdown Options
  companyTypes = ['Direct', 'Agency'];
  
  statusOptions = [
    'New Lead',
    'Attempted Contact',
    'Contacted',
    'Qualified',
    'Meeting Scheduled',
    'Proposal Out',
    'Follow Up',
    'Negotiation',
    'Verbal Commitment',
    'PO Received',
    'Closed Won',
    'Closed Lost',
    'On Hold'
  ];

  leadSources = [
    'Research',
    'Referral',
    'Database',
    'Website',
    'Inbound Inquiry',
    'Event',
    'Social Media'
  ];

  industries = [
    'Research',
    'Banking',
    'Automotive',
    'FMCG',
    'Real Estate',
    'Technology',
    'Healthcare',
    'Retail',
    'Others'
  ];

  countries = ['UAE', 'KSA', 'JOR', 'SYR', 'EGY', 'QAT', 'KWT', 'BHR', 'OMN', 'Other'];

  // Computed: Active employees sorted alphabetically
  sortedEmployees = computed(() => {
    return this.dataService.employees()
      .filter(e => !e.end_date)
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name));
  });

  // Computed: Products sorted alphabetically
  sortedProducts = computed(() => {
    return this.dataService.products().slice().sort((a, b) => {
      if (a.product_name.toLowerCase() === 'others') return 1;
      if (b.product_name.toLowerCase() === 'others') return -1;
      return a.product_name.localeCompare(b.product_name);
    });
  });

  // Computed: Filtered clients
  filteredClients = computed(() => {
    let data = this.dataService.clients();

    if (this.filterCountry() !== 'ALL') {
      data = data.filter(c => c.country === this.filterCountry());
    }
    
    if (this.filterStatus() !== 'ALL') {
      data = data.filter(c => c.status === this.filterStatus());
    }
    
    if (this.filterIndustry() !== 'ALL') {
      data = data.filter(c => c.industry === this.filterIndustry());
    }
    
    if (this.filterProduct() !== null) {
      data = data.filter(c => c.product_id === this.filterProduct());
    }
    
    const text = this.searchText().toLowerCase();
    if (text) {
      data = data.filter(c =>
        c.client_name.toLowerCase().includes(text) ||
        c.poc_name?.toLowerCase().includes(text) ||
        c.contact_email?.toLowerCase().includes(text)
      );
    }

    return data.sort((a, b) => a.client_name.localeCompare(b.client_name));
  });

  // Stats
  totalClients = computed(() => this.dataService.clients().length);
  newLeadsCount = computed(() => this.dataService.clients().filter(c => c.status === 'New Lead').length);
  qualifiedCount = computed(() => this.dataService.clients().filter(c => c.status === 'Qualified' || c.status === 'Meeting Scheduled' || c.status === 'Proposal Out').length);
  closedWonCount = computed(() => this.dataService.clients().filter(c => c.status === 'Closed Won').length);
  totalPipelineValue = computed(() => {
    return this.dataService.clients()
      .filter(c => c.status !== 'Closed Won' && c.status !== 'Closed Lost')
      .reduce((sum, c) => sum + (c.estimated_deal_value || 0), 0);
  });

  ngAfterViewInit() {
    this.loadFlatpickrStyles();
  }

  ngOnDestroy() {
    this.destroyFlatpickrInstances();
  }

  private loadFlatpickrStyles() {
    if (!document.getElementById('flatpickr-css')) {
      const link = document.createElement('link');
      link.id = 'flatpickr-css';
      link.rel = 'stylesheet';
      link.href = 'https://cdn.jsdelivr.net/npm/flatpickr/dist/flatpickr.min.css';
      document.head.appendChild(link);
    }

    if (!document.getElementById('flatpickr-js')) {
      const script = document.createElement('script');
      script.id = 'flatpickr-js';
      script.src = 'https://cdn.jsdelivr.net/npm/flatpickr';
      script.onload = () => {
        if (this.currentView() === 'form') {
          this.initializeFlatpickr();
        }
      };
      document.head.appendChild(script);
    }
  }

  private initializeFlatpickr() {
    this.destroyFlatpickrInstances();

    setTimeout(() => {
      if (typeof flatpickr === 'undefined') return;

      const config = {
        dateFormat: 'Y-m-d',
        altInput: true,
        altFormat: 'F j, Y',
        animate: true,
        disableMobile: true,
        wrap: false
      };

      const dateInputs = [
        { id: 'first_contact_date', field: 'first_contact_date' },
        { id: 'last_followup_date', field: 'last_followup_date' },
        { id: 'next_action_date', field: 'next_action_date' },
        { id: 'expected_closing_date', field: 'expected_closing_date' }
      ];

      dateInputs.forEach(input => {
        const el = document.getElementById(input.id);
        if (el) {
          const instance = flatpickr(el, {
            ...config,
            defaultDate: (this.currentClient as any)[input.field] || null,
            onChange: (selectedDates: Date[], dateStr: string) => {
              (this.currentClient as any)[input.field] = dateStr || null;
            }
          });
          this.flatpickrInstances.push(instance);
        }
      });
    }, 150);
  }

  private destroyFlatpickrInstances() {
    this.flatpickrInstances.forEach(instance => {
      if (instance && instance.destroy) {
        instance.destroy();
      }
    });
    this.flatpickrInstances = [];
  }

  getEmptyClient(): DimClient {
    return {
      client_id: 0,
      client_name: '',
      country: 'UAE',
      company_type: 'Direct',
      first_contact_date: new Date().toISOString().split('T')[0],
      status: 'New Lead',
      lead_source: undefined,
      industry: undefined,
      poc_name: '',
      contact_email: '',
      contact_phone: '',
      account_manager_id: undefined,
      product_id: undefined,
      estimated_deal_value: undefined,
      expected_closing_date: undefined,
      notes: '',
      last_followup_date: undefined,
      next_action_date: undefined,
      lead_id: undefined,
      relationship_manager_id: undefined
    };
  }

  openAddForm() {
    this.isEditMode = false;
    this.currentClient = this.getEmptyClient();
    this.currentView.set('form');
    setTimeout(() => this.initializeFlatpickr(), 250);
  }

  editClient(client: DimClient) {
    this.isEditMode = true;
    this.currentClient = { ...client };
    this.currentView.set('form');
    setTimeout(() => this.initializeFlatpickr(), 250);
  }

  goBackToList() {
    this.destroyFlatpickrInstances();
    this.currentView.set('list');
    this.currentClient = this.getEmptyClient();
  }

  confirmDelete(client: DimClient) {
    this.clientToDelete = client;
    this.showDeleteModal = true;
  }

  getStatusClass(status: string | undefined): string {
    if (!status) return 'bg-slate-100 text-slate-600';
    
    const statusClasses: Record<string, string> = {
      'New Lead': 'bg-blue-50 text-blue-700',
      'Attempted Contact': 'bg-indigo-50 text-indigo-700',
      'Contacted': 'bg-cyan-50 text-cyan-700',
      'Qualified': 'bg-emerald-50 text-emerald-700',
      'Meeting Scheduled': 'bg-purple-50 text-purple-700',
      'Proposal Out': 'bg-amber-50 text-amber-700',
      'Follow Up': 'bg-orange-50 text-orange-700',
      'Negotiation': 'bg-pink-50 text-pink-700',
      'Verbal Commitment': 'bg-lime-50 text-lime-700',
      'PO Received': 'bg-teal-50 text-teal-700',
      'Closed Won': 'bg-green-100 text-green-800',
      'Closed Lost': 'bg-red-50 text-red-700',
      'On Hold': 'bg-slate-100 text-slate-600'
    };
    
    return statusClasses[status] || 'bg-slate-100 text-slate-600';
  }

  formatCurrency(value: number | undefined): string {
    if (!value) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  }

  formatDate(dateStr: string | undefined): string {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  async save() {
    if (!this.currentClient.client_name?.trim()) {
      alert('Company Name is required');
      return;
    }

    this.saving.set(true);

    try {
      const payload: any = {
        client_name: this.currentClient.client_name.trim(),
        country: this.currentClient.country,
        company_type: this.currentClient.company_type || null,
        first_contact_date: this.currentClient.first_contact_date || null,
        account_manager_id: this.currentClient.account_manager_id ? Number(this.currentClient.account_manager_id) : null,
        poc_name: this.currentClient.poc_name || null,
        contact_email: this.currentClient.contact_email || null,
        contact_phone: this.currentClient.contact_phone || null,
        status: this.currentClient.status || 'New Lead',
        lead_source: this.currentClient.lead_source || null,
        industry: this.currentClient.industry || null,
        product_id: this.currentClient.product_id ? Number(this.currentClient.product_id) : null,
        estimated_deal_value: this.currentClient.estimated_deal_value ? Number(this.currentClient.estimated_deal_value) : null,
        expected_closing_date: this.currentClient.expected_closing_date || null,
        notes: this.currentClient.notes || null,
        last_followup_date: this.currentClient.last_followup_date || null,
        next_action_date: this.currentClient.next_action_date || null,
        lead_id: this.currentClient.lead_id ? Number(this.currentClient.lead_id) : null,
        relationship_manager_id: this.currentClient.relationship_manager_id ? Number(this.currentClient.relationship_manager_id) : null,
        contact_person: this.currentClient.poc_name || ''
      };

      let result;

      if (this.isEditMode) {
        result = await this.dataService.updateClient({ client_id: this.currentClient.client_id, ...payload });
      } else {
        result = await this.dataService.addClient(payload);
      }

      if (result.success) {
        this.goBackToList();
      } else {
        console.error('Save error:', result.error);
        alert('Failed to save: ' + result.error);
      }
    } catch (error: any) {
      console.error('Unexpected error:', error);
      alert('An unexpected error occurred: ' + error.message);
    } finally {
      this.saving.set(false);
    }
  }

  async deleteClient() {
    if (!this.clientToDelete) return;

    const { error } = await this.dataService.deleteClient(this.clientToDelete.client_id);
    if (error) {
      alert('Error deleting client: ' + error);
    }

    this.showDeleteModal = false;
    this.clientToDelete = null;
  }
}
