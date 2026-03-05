class Auth {
  constructor() {
    this.supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }

  async getSession() {
    const { data: { session } } = await this.supabase.auth.getSession();
    return session;
  }

  async signIn(email, password) {
    const { data, error } = await this.supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  }

  async signUp(email, password) {
    const { data, error } = await this.supabase.auth.signUp({ email, password });
    if (error) throw error;
    return data;
  }

  async signOut() {
    const { error } = await this.supabase.auth.signOut();
    if (error) throw error;
  }

  onAuthStateChange(callback) {
    this.supabase.auth.onAuthStateChange(callback);
  }
}
