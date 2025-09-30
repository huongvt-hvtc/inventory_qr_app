'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { CheckCircle, XCircle, Loader2, Package } from 'lucide-react';

export default function TestDatabasePage() {
  const [connectionStatus, setConnectionStatus] = useState<'testing' | 'success' | 'error'>('testing');
  const [tables, setTables] = useState<any[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    testConnection();
  }, []);

  const testConnection = async () => {
    setConnectionStatus('testing');
    setError(null);

    try {
      // Test 1: Basic connection
      console.log('Testing basic connection...');
      const { data: testData, error: testError } = await supabase
        .from('assets')
        .select('count')
        .limit(1);

      if (testError) {
        throw new Error(`Connection failed: ${testError.message}`);
      }

      console.log('Basic connection: SUCCESS');

      // Test 2: Get assets
      console.log('Testing assets query...');
      const { data: assetsData, error: assetsError } = await supabase
        .from('assets')
        .select('*')
        .limit(10);

      if (assetsError) {
        throw new Error(`Assets query failed: ${assetsError.message}`);
      }

      console.log('Assets query: SUCCESS', assetsData);
      setAssets(assetsData || []);

      // Test 3: Get table info
      console.log('Testing table information...');
      const tables = [
        { name: 'assets', count: assetsData?.length || 0 },
        { name: 'inventory_records', count: 0 },
        { name: 'users', count: 0 },
        { name: 'activity_logs', count: 0 }
      ];

      // Get counts for other tables
      for (const table of tables) {
        if (table.name !== 'assets') {
          try {
            const { count } = await supabase
              .from(table.name)
              .select('*', { count: 'exact', head: true });
            table.count = count || 0;
          } catch (err) {
            console.warn(`Failed to get count for ${table.name}:`, err);
          }
        }
      }

      setTables(tables);
      setConnectionStatus('success');
      console.log('All tests: SUCCESS');

    } catch (err: any) {
      console.error('Database test failed:', err);
      setError(err.message);
      setConnectionStatus('error');
    }
  };

  const createSampleAsset = async () => {
    try {
      const sampleAsset = {
        asset_code: `TEST${Date.now()}`,
        name: 'Test Asset from App',
        model: 'Test Model',
        serial: 'TEST123',
        tech_code: 'TEST001',
        department: 'Test Department',
        status: 'Đang sử dụng',
        location: 'Test Location',
        notes: 'Created from test page'
      };

      const { data, error } = await supabase
        .from('assets')
        .insert([sampleAsset])
        .select()
        .single();

      if (error) {
        throw error;
      }

      alert('Sample asset created successfully!');
      testConnection(); // Refresh data
    } catch (err: any) {
      alert(`Failed to create asset: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6 pb-48 md:pb-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Package className="h-8 w-8 text-blue-600" />
          Database Connection Test
        </h1>
        <p className="text-sm text-gray-600 mt-1">
          Test your Supabase database connection and verify tables
        </p>
      </div>

      {/* Connection Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {connectionStatus === 'testing' && <Loader2 className="h-5 w-5 animate-spin" />}
            {connectionStatus === 'success' && <CheckCircle className="h-5 w-5 text-green-600" />}
            {connectionStatus === 'error' && <XCircle className="h-5 w-5 text-red-600" />}
            Connection Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          {connectionStatus === 'testing' && (
            <p className="text-gray-600">Testing database connection...</p>
          )}

          {connectionStatus === 'success' && (
            <div className="space-y-2">
              <p className="text-green-600 font-medium">✅ Connection successful!</p>
              <p className="text-sm text-gray-600">Your Supabase database is connected and working.</p>
            </div>
          )}

          {connectionStatus === 'error' && (
            <div className="space-y-2">
              <p className="text-red-600 font-medium">❌ Connection failed</p>
              <p className="text-sm text-gray-600">Error: {error}</p>
              <Button onClick={testConnection} variant="outline" size="sm">
                Retry Connection
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tables Status */}
      {tables.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Database Tables</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {tables.map(table => (
                <div key={table.name} className="text-center p-3 bg-gray-50 rounded-lg">
                  <p className="font-medium text-gray-900">{table.name}</p>
                  <p className="text-2xl font-bold text-blue-600">{table.count}</p>
                  <p className="text-xs text-gray-500">records</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Assets Preview */}
      {assets.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Assets Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {assets.slice(0, 5).map(asset => (
                <div key={asset.id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                  <div>
                    <span className="font-medium">{asset.asset_code}</span>
                    <span className="text-gray-600 ml-2">{asset.name}</span>
                  </div>
                  <span className="text-sm text-gray-500">{asset.department}</span>
                </div>
              ))}
              {assets.length > 5 && (
                <p className="text-sm text-gray-500 text-center">
                  ... and {assets.length - 5} more assets
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Test Actions */}
      {connectionStatus === 'success' && (
        <Card>
          <CardHeader>
            <CardTitle>Test Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Button onClick={testConnection} variant="outline">
                🔄 Refresh Connection Test
              </Button>
              <Button onClick={createSampleAsset} variant="secondary">
                ➕ Create Sample Asset
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Environment Info */}
      <Card>
        <CardHeader>
          <CardTitle>Environment Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Supabase URL:</span>
              <span className="font-mono text-blue-600">
                {process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Configured' : '❌ Missing'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Supabase Key:</span>
              <span className="font-mono text-blue-600">
                {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Configured' : '❌ Missing'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Google Client:</span>
              <span className="font-mono text-blue-600">
                {process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ? '✅ Configured' : '⚠️ Optional'}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}