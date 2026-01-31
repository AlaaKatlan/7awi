import { Component, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService } from '../../services/data.service';
import { DimClient } from '../../models/data.models';

@Component({
  selector: 'app-client-manager',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="p-6 bg-[#f8fafc] min-h-screen">
      <!-- Stats Cards -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div class="bg-white p-6 rounded-2xl shadow-sm border-l-4 border-[#1e3a8a]">
          <h3 class="text-gray-400 text-sm font-medium uppercase">Total Clients</h3>
          <p class="text-3xl font-black text-gray-800 mt-2">{{ filteredClients().length }}</p>
        </div>
        <div class="bg-white p-6 rounded-2xl shadow-sm border-l-4 border-emerald-500">
          <h3 class="text-gray-400 text-sm font-medium uppercase">UAE Clients</h3>
          <p class="text-3xl font-black text-gray-800 mt-2">{{ uaeClientsCount() }}</p>
        </div>
        <div class="bg-white p-6 rounded-2xl shadow-sm border-l-4 border-amber-500">
          <h3 class="text-gray-400 text-sm font-medium uppercase">KSA Clients</h3>
          <p class="text-3xl font-black text-gray-800 mt-2">{{ ksaClientsCount() }}</p>
        </div>
      </div>

      <!-- Filters & Actions -->
      <div class="bg-white p-4 rounded-xl shadow-sm mb-6 border border-gray-100 flex flex-wrap gap-4 items-end">
        <div class="flex-1 min-w-[250px]">
          <label class="text-[10px] font-black text-gray-400 uppercase mb-1 block">Search Clients</label>
          <input type="text" [ngModel]="searchText()" (ngModelChange)="searchText.set($event)" 
                 placeholder="Search by name, contact, email..."
                 class="w-full bg-slate-50 border-0 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#1e3a8a] outline-none">
        </div>

        <div class="w-40">
          <label class="text-[10px] font-black text-gray-400 uppercase mb-1 block">Country</label>
          <select [ngModel]="filterCountry()" (ngModelChange)="filterCountry.set($event)"
                  class="w-full bg-slate-50 border-0 rounded-lg px-3 py-2 outline-none cursor-pointer">
            <option value="ALL">All Countries</option>
            <option value="UAE">UAE</option>
            <option value="KSA">KSA</option>
          </select>
        </div>

        <button (click)="openModal()"
                class="bg-[#1e3a8a] text-white px-6 py-2 rounded-lg font-bold shadow-md hover:bg-blue-900 transition flex items-center gap-2">
          <span class="material-icons text-sm">add</span> Add Client
        </button>
      </div>

      <!-- Clients Table -->
      <div class="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
        <table class="w-full text-left border-collapse">
          <thead class="bg-slate-50 text-[10px] text-gray-400 font-black uppercase tracking-widest border-b border-slate-100">
            <tr>
              <th class="p-5">Client Name</th>
              <th class="p-5">Contact Person</th>
              <th class="p-5">Email</th>
              <th class="p-5">Phone</th>
              <th class="p-5 text-center">Country</th>
              <th class="p-5 text-center">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-50 text-sm">
            @for (client of filteredClients(); track client.client_id) {
              <tr class="hover:bg-blue-50/50 transition duration-150">
                <td class="p-5">
                  <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white font-bold text-sm">
                      {{ client.client_name.charAt(0).toUpperCase() }}
                    </div>
                    <span class="font-bold text-slate-700">{{ client.client_name }}</span>
                  </div>
                </td>
                <td class="p-5 text-slate-600">{{ client.contact_person || '—' }}</td>
                <td class="p-5">
                  @if (client.contact_email) {
                    <a [href]="'mailto:' + client.contact_email" class="text-blue-600 hover:underline text-sm">
                      {{ client.contact_email }}
                    </a>
                  } @else {
                    <span class="text-slate-300">—</span>
                  }
                </td>
                <td class="p-5 text-slate-600 font-mono text-sm">{{ client.contact_phone || '—' }}</td>
                <td class="p-5 text-center">
                  <span [class]="client.country === 'UAE' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'"
                        class="px-3 py-1 rounded-full text-[10px] font-black uppercase">
                    {{ client.country }}
                  </span>
                </td>
                <td class="p-5 text-center">
                  <div class="flex items-center justify-center gap-2">
                    <button (click)="editClient(client)" class="text-slate-400 hover:text-[#1e3a8a] transition p-2">
                      <span class="material-icons text-base">edit</span>
                    </button>
                    <button (click)="confirmDelete(client)" class="text-slate-400 hover:text-red-500 transition p-2">
                      <span class="material-icons text-base">delete</span>
                    </button>
                  </div>
                </td>
              </tr>
            } @empty {
              <tr>
                <td colspan="6" class="p-10 text-center text-slate-400 italic">No clients found matching your criteria.</td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </div>

    <!-- Add/Edit Modal -->
    @if (showModal) {
      <div class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div class="bg-white p-8 rounded-[2rem] w-full max-w-lg shadow-2xl">
          <div class="flex justify-between items-center mb-6">
            <h3 class="font-black text-xl text-slate-800 uppercase tracking-tight">
              {{ isEditMode ? 'Update Client' : 'New Client' }}
            </h3>
            <button (click)="closeModal()" class="text-slate-400 hover:text-rose-500 transition">
              <span class="material-icons">close</span>
            </button>
          </div>

          <div class="space-y-4">
            <div>
              <label class="block text-[10px] font-black text-slate-400 uppercase mb-1">Client / Company Name *</label>
              <input type="text" [(ngModel)]="currentClient.client_name"
                     class="w-full p-3 bg-slate-50 rounded-xl border-0 outline-none focus:ring-2 focus:ring-[#1e3a8a]"
                     placeholder="Enter client name">
            </div>

            <div>
              <label class="block text-[10px] font-black text-slate-400 uppercase mb-1">Country *</label>
              <select [(ngModel)]="currentClient.country"
                      class="w-full p-3 bg-slate-50 rounded-xl border-0 outline-none focus:ring-2 focus:ring-[#1e3a8a] cursor-pointer">
                <option value="UAE">UAE</option>
                <option value="KSA">KSA</option>
              </select>
            </div>

            <div class="border-t border-slate-100 pt-4 mt-4">
              <h4 class="text-xs font-bold text-slate-500 uppercase mb-3 flex items-center gap-2">
                <span class="material-icons text-sm">person</span> Main Contact Person
              </h4>

              <div class="space-y-3">
                <div>
                  <label class="block text-[10px] font-black text-slate-400 uppercase mb-1">Full Name</label>
                  <input type="text" [(ngModel)]="currentClient.contact_person"
                         class="w-full p-3 bg-slate-50 rounded-xl border-0 outline-none focus:ring-2 focus:ring-[#1e3a8a]"
                         placeholder="Contact person name">
                </div>

                <div class="grid grid-cols-2 gap-3">
                  <div>
                    <label class="block text-[10px] font-black text-slate-400 uppercase mb-1">Email</label>
                    <input type="email" [(ngModel)]="currentClient.contact_email"
                           class="w-full p-3 bg-slate-50 rounded-xl border-0 outline-none focus:ring-2 focus:ring-[#1e3a8a]"
                           placeholder="email@example.com">
                  </div>
                  <div>
                    <label class="block text-[10px] font-black text-slate-400 uppercase mb-1">Phone</label>
                    <input type="tel" [(ngModel)]="currentClient.contact_phone"
                           class="w-full p-3 bg-slate-50 rounded-xl border-0 outline-none focus:ring-2 focus:ring-[#1e3a8a]"
                           placeholder="+971 50 000 0000">
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="mt-8 flex gap-3">
            <button (click)="closeModal()"
                    class="flex-1 py-3 text-slate-400 font-bold uppercase text-[10px] tracking-widest hover:bg-slate-50 rounded-xl transition">
              Cancel
            </button>
            <button (click)="save()" [disabled]="!currentClient.client_name"
                    class="flex-[2] py-3 bg-[#1e3a8a] text-white rounded-xl font-black shadow-lg shadow-blue-200 uppercase text-[10px] tracking-widest hover:bg-blue-900 transition disabled:opacity-50 disabled:cursor-not-allowed">
              {{ isEditMode ? 'Update Client' : 'Save Client' }}
            </button>
          </div>
        </div>
      </div>
    }

    <!-- Delete Confirmation Modal -->
    @if (showDeleteModal) {
      <div class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div class="bg-white p-8 rounded-[2rem] w-full max-w-md shadow-2xl text-center">
          <div class="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span class="material-icons text-red-500 text-3xl">warning</span>
          </div>
          <h3 class="font-black text-xl text-slate-800 mb-2">Delete Client?</h3>
          <p class="text-slate-500 mb-6">
            Are you sure you want to delete <strong>{{ clientToDelete?.client_name }}</strong>? 
            This action cannot be undone.
          </p>
          <div class="flex gap-3">
            <button (click)="showDeleteModal = false"
                    class="flex-1 py-3 text-slate-400 font-bold uppercase text-[10px] tracking-widest hover:bg-slate-50 rounded-xl transition">
              Cancel
            </button>
            <button (click)="deleteClient()"
                    class="flex-1 py-3 bg-red-500 text-white rounded-xl font-black shadow-lg uppercase text-[10px] tracking-widest hover:bg-red-600 transition">
              Delete
            </button>
          </div>
        </div>
      </div>
    }
  `
})
export class ClientManagerComponent {
  dataService = inject(DataService);

  searchText = signal('');
  filterCountry = signal('ALL');
  
  showModal = false;
  showDeleteModal = false;
  isEditMode = false;
  clientToDelete: DimClient | null = null;

  currentClient: DimClient = this.getEmptyClient();

  filteredClients = computed(() => {
    let data = this.dataService.clients();

    if (this.filterCountry() !== 'ALL') {
      data = data.filter(c => c.country === this.filterCountry());
    }

    const text = this.searchText().toLowerCase();
    if (text) {
      data = data.filter(c =>
        c.client_name.toLowerCase().includes(text) ||
        (c.contact_person?.toLowerCase().includes(text)) ||
        (c.contact_email?.toLowerCase().includes(text))
      );
    }

    return data;
  });

  uaeClientsCount = computed(() => this.dataService.clients().filter(c => c.country === 'UAE').length);
  ksaClientsCount = computed(() => this.dataService.clients().filter(c => c.country === 'KSA').length);

  getEmptyClient(): DimClient {
    return {
      client_id: 0,
      client_name: '',
      country: 'UAE',
      contact_person: '',
      contact_email: '',
      contact_phone: ''
    };
  }

  openModal() {
    this.isEditMode = false;
    this.currentClient = this.getEmptyClient();
    this.showModal = true;
  }

  editClient(client: DimClient) {
    this.isEditMode = true;
    this.currentClient = { ...client };
    this.showModal = true;
  }

  closeModal() {
    this.showModal = false;
    this.currentClient = this.getEmptyClient();
  }

  confirmDelete(client: DimClient) {
    this.clientToDelete = client;
    this.showDeleteModal = true;
  }

  async save() {
    if (!this.currentClient.client_name.trim()) return;

    if (this.isEditMode) {
      const { error } = await this.dataService.updateClient(this.currentClient);
      if (error) {
        alert('Error updating client: ' + error);
        return;
      }
    } else {
      const { error } = await this.dataService.addClient(this.currentClient);
      if (error) {
        alert('Error adding client: ' + error);
        return;
      }
    }

    this.closeModal();
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
