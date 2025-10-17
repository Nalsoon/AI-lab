import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import NaturalLanguageLogger from './components/NaturalLanguageLogger';
import NaturalLanguageDemo from './components/NaturalLanguageDemo';
import './App.css';

// Create a client
const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/natural-log" element={<NaturalLanguageLogger />} />
            <Route path="/demo" element={<NaturalLanguageDemo />} />
          </Routes>
        </Layout>
      </Router>
    </QueryClientProvider>
  );
}

export default App;
