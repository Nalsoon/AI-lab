import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('AuthContext: Getting initial session...')
    
    // Get initial session directly
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('AuthContext: Initial session result:', { 
        hasSession: !!session, 
        hasUser: !!session?.user,
        userId: session?.user?.id 
      });
      
      setUser(session?.user ?? null);
      if (session?.user) {
        console.log('AuthContext: User found, loading profile...');
        loadUserProfile(session.user.id);
      } else {
        console.log('AuthContext: No user, setting loading false');
        setLoading(false);
      }
    }).catch((error) => {
      console.error('AuthContext: Error getting session:', error);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        await loadUserProfile(session.user.id);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const loadUserProfile = async (userId) => {
    console.log('AuthContext: Loading profile for user:', userId);
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      console.log('AuthContext: Profile query result:', { 
        hasData: !!data, 
        hasError: !!error,
        errorCode: error?.code,
        errorMessage: error?.message 
      });

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Error loading profile:', error);
        setProfile(null);
      } else {
        console.log('AuthContext: Setting profile:', data);
        setProfile(data);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      setProfile(null);
    } finally {
      console.log('AuthContext: Setting loading to false');
      setLoading(false);
    }
  };

  const signUp = async (email, password, userData) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: userData
        }
      });

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Sign up error:', error);
      return { data: null, error };
    }
  };

  const signIn = async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Sign in error:', error);
      return { data: null, error };
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const createProfile = async (profileData) => {
    try {
      console.log('Creating profile with data:', profileData);
      
      // First, try to update if profile exists, otherwise insert
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', profileData.id)
        .single();

      let data, error;
      
      if (existingProfile) {
        // Update existing profile
        console.log('Profile exists, updating...');
        const result = await supabase
          .from('profiles')
          .update(profileData)
          .eq('id', profileData.id)
          .select()
          .single();
        data = result.data;
        error = result.error;
      } else {
        // Insert new profile
        console.log('Profile does not exist, inserting...');
        const result = await supabase
          .from('profiles')
          .insert([profileData])
          .select()
          .single();
        data = result.data;
        error = result.error;
      }

      if (error) {
        console.error('Profile operation error:', error);
        throw error;
      }
      
      console.log('Profile operation successful:', data);
      setProfile(data);
      return { data, error: null };
    } catch (error) {
      console.error('Create profile error:', error);
      return { data: null, error };
    }
  };

  const updateProfile = async (updates) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id)
        .select()
        .single();

      if (error) throw error;
      setProfile(data);
      return { data, error: null };
    } catch (error) {
      console.error('Update profile error:', error);
      return { data: null, error };
    }
  };

  const value = {
    user,
    profile,
    loading,
    signUp,
    signIn,
    signOut,
    createProfile,
    updateProfile,
    loadUserProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
