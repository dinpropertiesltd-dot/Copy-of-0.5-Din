
import { createClient } from '@supabase/supabase-js';
import { PropertyFile } from './types';

const supabaseUrl = 'https://guboreqbnparrhhcrqbp.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd1Ym9yZXFibnBhcnJoaGNycWJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY5OTUzMDEsImV4cCI6MjA4MjU3MTMwMX0.Ppo_g_n8pp0r9jsUSp9xBaRRn0XeyTDvUNkM6MNnHxM';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Normalizes CNIC by removing all non-numeric characters (dashes, spaces, etc.)
 */
export const normalizeCNIC = (cnic: string) => cnic.replace(/[^0-9]/g, '');

/**
 * Translation Layer: Maps Database (snake_case) to UI (camelCase)
 */
const mapToUI = (f: any): PropertyFile => ({
  fileNo: f.file_no,
  currencyNo: f.currency_no || '-',
  plotSize: f.plot_size || '-',
  plotValue: Number(f.plot_value) || 0,
  balance: Number(f.balance) || 0,
  receivable: Number(f.receivable) || 0,
  totalReceivable: Number(f.total_receivable) || 0,
  paymentReceived: Number(f.payment_received) || 0,
  surcharge: Number(f.surcharge) || 0,
  overdue: Number(f.overdue) || 0,
  ownerName: f.owner_name || '-',
  ownerCNIC: f.owner_cnic || '-',
  fatherName: f.father_name || '-',
  cellNo: f.cell_no || '-',
  regDate: f.reg_date || '-',
  address: f.address || '-',
  plotNo: f.plot_no || '-',
  block: f.block || '-',
  park: f.park || '-',
  corner: f.corner || '-',
  mainBoulevard: f.main_boulevard || '-',
  transactions: Array.isArray(f.transactions) ? f.transactions : [],
  uploadedStatementUrl: f.uploaded_statement_url,
  uploadedStatementName: f.uploaded_statement_name,
  lastNotified: f.last_notified
});

/**
 * Translation Layer: Maps UI (camelCase) to Database (snake_case)
 */
const mapToDB = (f: PropertyFile): any => ({
  file_no: f.fileNo,
  owner_cnic: f.ownerCNIC,
  owner_cnic_normalized: normalizeCNIC(f.ownerCNIC),
  owner_name: f.ownerName,
  plot_size: f.plotSize,
  plot_value: f.plotValue,
  balance: f.balance,
  receivable: f.receivable,
  total_receivable: f.totalReceivable || f.plotValue,
  payment_received: f.paymentReceived,
  reg_date: f.regDate,
  father_name: f.fatherName,
  cell_no: f.cellNo,
  address: f.address,
  // Fix: Access plotNo instead of non-existent plot_no on PropertyFile
  plot_no: f.plotNo,
  block: f.block,
  park: f.park,
  corner: f.corner,
  main_boulevard: f.mainBoulevard,
  currency_no: f.currencyNo,
  surcharge: f.surcharge || 0,
  overdue: f.overdue || 0,
  transactions: f.transactions || [],
  last_notified: f.lastNotified
});

/**
 * PRODUCTION AUTH HELPERS
 */
export const authProvider = {
  signUp: async (email: string, password: string, metadata: any) => {
    return await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata
      }
    });
  },

  signIn: async (email: string, password: string) => {
    return await supabase.auth.signInWithPassword({
      email,
      password,
    });
  },

  sendLoginChallenge: async (email: string) => {
    return await supabase.auth.signInWithOtp({
      email: email,
      options: {
        shouldCreateUser: false, 
      },
    });
  },

  verifyOTP: async (email: string, token: string, type: 'email' | 'signup' = 'email') => {
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: type, 
    });
    
    return { data, error };
  },

  upsertProfile: async (profile: any) => {
    if (profile.cnic) {
      profile.cnic_normalized = normalizeCNIC(profile.cnic);
    }
    return await supabase
      .from('profiles')
      .upsert(profile, { onConflict: 'id' });
  },

  getProfile: async (id: string) => {
    return await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single();
  },

  /**
   * Checks if either the CNIC or Email is already registered in the profiles table.
   */
  checkIdentityExists: async (cnic: string, email: string) => {
    const norm = normalizeCNIC(cnic);
    const { data, error } = await supabase
      .from('profiles')
      .select('email, cnic, cnic_normalized')
      .or(`cnic_normalized.eq.${norm},email.eq.${email.toLowerCase()}`)
      .maybeSingle();
    return { data, error };
  },

  checkCnicExists: async (cnic: string) => {
    const norm = normalizeCNIC(cnic);
    const { data, error } = await supabase
      .from('profiles')
      .select('email')
      .eq('cnic_normalized', norm)
      .maybeSingle();
    return { data, error };
  },

  fetchUserFiles: async (cnic: string) => {
    const norm = normalizeCNIC(cnic);
    const { data: files, error } = await supabase
      .from('property_files')
      .select('*')
      .eq('owner_cnic_normalized', norm);

    if (error || !files) return { data: [], error };
    return { data: files.map(mapToUI), error: null };
  },

  fetchAllFiles: async () => {
    const { data, error } = await supabase
      .from('property_files')
      .select('*');
    if (error || !data) return { data: [], error };
    return { data: data.map(mapToUI), error: null };
  },

  bulkSyncToCloud: async (files: PropertyFile[]) => {
    const dbFiles = files.map(mapToDB);
    const BATCH_SIZE = 50;
    for (let i = 0; i < dbFiles.length; i += BATCH_SIZE) {
      const batch = dbFiles.slice(i, i + BATCH_SIZE);
      const { error } = await supabase
        .from('property_files')
        .upsert(batch, { onConflict: 'file_no' });
      
      if (error) {
        console.error("Batch Sync Error:", error);
        throw error;
      }
    }
    return { success: true };
  },

  updateLastNotified: async (fileNo: string, timestamp: string) => {
    return await supabase
      .from('property_files')
      .update({ last_notified: timestamp })
      .eq('file_no', fileNo);
  },

  signOut: async () => {
    await supabase.auth.signOut();
  },

  getSession: async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session;
  }
};
