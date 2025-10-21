import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
  Share,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BarChart } from "react-native-gifted-charts";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import API from "../api";
import { useAuth } from "../context/AuthContext";

export default function SalesReport() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [analytics, setAnalytics] = useState({
    totalRevenue: 0,
    totalOrders: 0,
    thisMonthSales: 0,
    thisMonthOrders: 0,
    monthlySales: []
  });
  const [reportData, setReportData] = useState([]);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      console.log('📊 Fetching sales analytics...');
      
      const response = await API.get('/orders/analytics');
      console.log('✅ Analytics received:', response.data);
      
      if (response.data.success) {
        setAnalytics(response.data.analytics);
      }
    } catch (error) {
      console.error('❌ Error fetching analytics:', error);
      Alert.alert('Error', 'Failed to load sales data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchDetailedReport = async () => {
    try {
      console.log('📄 Fetching detailed sales report...');
      const response = await API.get('/orders/sales-report');
      console.log('✅ Report received:', response.data.count, 'records');
      
      if (response.data.success) {
        setReportData(response.data.report);
        return response.data.report;
      }
      return [];
    } catch (error) {
      console.error('❌ Error fetching report:', error);
      Alert.alert('Error', 'Failed to load detailed report.');
      return [];
    }
  };

  const formatChartData = () => {
    if (!analytics.monthlySales || analytics.monthlySales.length === 0) {
      return [
        { value: 0, label: "No Data" }
      ];
    }

    return analytics.monthlySales.map(item => ({
      value: item.revenue / 1000, // Convert to thousands for better display
      label: item.month
    }));
  };

  const handleViewReport = async () => {
    try {
      const report = await fetchDetailedReport();
      
      if (report.length === 0) {
        Alert.alert('No Data', 'No sales records found.');
        return;
      }

      // Create a simple text summary
      let summary = `Sales Report\n`;
      summary += `Generated: ${new Date().toLocaleDateString()}\n\n`;
      summary += `Total Orders: ${report.length}\n`;
      summary += `Total Revenue: LKR ${report.reduce((sum, item) => sum + parseFloat(item.subtotal), 0).toFixed(2)}\n\n`;
      summary += `Recent Orders:\n`;
      
      report.slice(0, 10).forEach((order, index) => {
        summary += `${index + 1}. ${order.order_number} - ${order.product_name} x${order.quantity} - LKR ${order.subtotal}\n`;
      });

      Alert.alert('Sales Report', summary, [
        { text: 'OK' }
      ]);
    } catch (error) {
      console.error('Error viewing report:', error);
      Alert.alert('Error', 'Failed to generate report.');
    }
  };

  const handleDownloadPDF = async () => {
    if (generatingPDF) {
      Alert.alert('Please Wait', 'PDF is already being generated...');
      return;
    }

    if (analytics.totalOrders === 0) {
      Alert.alert(
        'No Sales Data',
        'You need to have completed orders to generate a sales report. Create some orders first.',
        [{ text: 'OK' }]
      );
      return;
    }

    try {
      Alert.alert(
        'Generate PDF Report',
        'This will create a detailed sales report with all your orders.',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Generate', 
            onPress: async () => {
              setGeneratingPDF(true);
              try {
                await generatePDF();
              } finally {
                setGeneratingPDF(false);
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error:', error);
      setGeneratingPDF(false);
    }
  };

  const generatePDF = async () => {
    try {
      console.log('🔄 Starting PDF generation...');
      console.log('📊 Current analytics:', analytics);

      const report = await fetchDetailedReport();
      console.log('📄 Report data fetched:', Array.isArray(report) ? report.length : 'invalid', 'records');

      if (!Array.isArray(report) || report.length === 0) {
        Alert.alert('No Data', 'No sales records to generate PDF. Please ensure you have completed orders.');
        return;
      }

      // Sanitize and normalize report data to avoid runtime errors when building HTML
      const safeReport = report.map((order, idx) => {
        const safe = {
          order_number: order?.order_number || `#${idx + 1}`,
          created_at: order?.created_at ? new Date(order.created_at) : null,
          product_name: String(order?.product_name || 'Unknown Product'),
          customer_name: String(order?.customer_name || 'Unknown Customer'),
          quantity: Number.isFinite(Number(order?.quantity)) ? Number(order.quantity) : 0,
          price: Number.isFinite(Number(order?.price)) ? Number(order.price) : 0,
          subtotal: Number.isFinite(Number(order?.subtotal)) ? Number(order.subtotal) : 0,
          status: String(order?.status || 'unknown')
        };
        return safe;
      });

      console.log('✅ Normalized report items:', safeReport.length);

      console.log('🎨 Creating HTML template...');

      // Minimal HTML-escape helper
      const escapeHtml = (str) => String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');

      // Build rows safely
      const rowsHtml = safeReport.map(order => {
        const dateText = order.created_at ? escapeHtml(order.created_at.toLocaleDateString()) : 'N/A';
        return `
          <tr>
            <td>${escapeHtml(order.order_number)}</td>
            <td>${dateText}</td>
            <td>${escapeHtml(order.product_name)}</td>
            <td>${escapeHtml(order.customer_name)}</td>
            <td>${escapeHtml(order.quantity)}</td>
            <td>LKR ${escapeHtml(order.price.toFixed(2))}</td>
            <td>LKR ${escapeHtml(order.subtotal.toFixed(2))}</td>
            <td>${escapeHtml(order.status)}</td>
          </tr>
        `;
      }).join('\n');

      // Create HTML for PDF
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Sales Report</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { color: #f97316; text-align: center; }
            .summary { background: #f3f4f6; padding: 15px; margin: 20px 0; border-radius: 8px; }
            .summary-item { display: inline-block; margin: 10px 20px; }
            .summary-label { font-weight: bold; color: #666; }
            .summary-value { font-size: 18px; color: #000; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { background: #f97316; color: white; padding: 10px; text-align: left; }
            td { padding: 8px; border-bottom: 1px solid #ddd; }
            tr:hover { background: #f9f9f9; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <h1>Sales Report</h1>
          <p style="text-align: center; color: #666;">Generated on ${new Date().toLocaleString()}</p>
          
          <div class="summary">
            <div class="summary-item">
              <div class="summary-label">Total Revenue</div>
              <div class="summary-value">LKR ${Number(analytics.totalRevenue || 0).toFixed(2)}</div>
            </div>
            <div class="summary-item">
              <div class="summary-label">Total Orders</div>
              <div class="summary-value">${Number(analytics.totalOrders || 0)}</div>
            </div>
            <div class="summary-item">
              <div class="summary-label">This Month Sales</div>
              <div class="summary-value">LKR ${Number(analytics.thisMonthSales || 0).toFixed(2)}</div>
            </div>
          </div>

          <h2>Order Details</h2>
          <table>
            <thead>
              <tr>
                <th>Order #</th>
                <th>Date</th>
                <th>Product</th>
                <th>Customer</th>
                <th>Qty</th>
                <th>Price</th>
                <th>Subtotal</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>

          <div class="footer">
            <p>Report generated by DigiMart Seller Center</p>
            <p>Seller: ${escapeHtml(user?.name || 'Unknown')}</p>
          </div>
        </body>
        </html>
      `;

      console.log('📄 Creating PDF with expo-print...');

      const { uri } = await Print.createAsync({ html });
      console.log('✅ PDF created successfully at:', uri);

      // Check if file exists
      const fileInfo = await FileSystem.getInfoAsync(uri);
      console.log('📁 PDF file info:', fileInfo);

      if (!fileInfo.exists) {
        throw new Error('PDF file was not created');
      }

      // Share or save the PDF
      const isAvailable = await Sharing.isAvailableAsync();
      console.log('🔗 Sharing available:', isAvailable);

      if (isAvailable) {
        console.log('📤 Opening share dialog...');
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Save or Share Sales Report',
          UTI: 'com.adobe.pdf'
        });
        console.log('✅ Share dialog completed');
        Alert.alert('Success', 'PDF report ready! Choose where to save or share it.');
      } else {
        // Fallback: Try to save to downloads or show message
        const fileName = `Sales_Report_${new Date().getTime()}.pdf`;
        const downloadDir = FileSystem.documentDirectory + fileName;
        
        console.log('💾 Copying PDF to:', downloadDir);
        await FileSystem.copyAsync({
          from: uri,
          to: downloadDir
        });
        
        Alert.alert(
          'PDF Generated', 
          `Report saved to: ${fileName}\n\nLocation: Documents folder`,
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('❌ Error generating PDF:', error);
      console.error('Error details:', {
        message: error?.message,
        stack: error?.stack
      });
      
      Alert.alert(
        'PDF Generation Failed', 
        `Could not create PDF report.\n\nError: ${error?.message || 'unknown'}\n\nPlease try again or check if you have sales data.`,
        [{ text: 'OK' }]
      );
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-orange-400">
        <View className="px-5 py-4 bg-orange-400 shadow-md rounded-b-3xl">
          <View className="flex-row items-center justify-between">
            <Pressable onPress={() => router.back()}>
              <Ionicons name="chevron-back" size={28} color="white" />
            </Pressable>
            <Text className="absolute left-0 right-0 text-xl font-bold text-center text-white">
              Sales Report
            </Text>
            <View style={{ width: 28 }} />
          </View>
        </View>
        <View className="items-center justify-center flex-1 bg-white">
          <ActivityIndicator size="large" color="#f97316" />
          <Text className="mt-4 text-gray-600">Loading sales data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-orange-400">
      {/* Header */}
      <View className="px-5 py-4 bg-orange-400 shadow-md rounded-b-3xl">
        <View className="flex-row items-center justify-between">
          <Pressable onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={28} color="white" />
          </Pressable>
          <Text className="absolute left-0 right-0 text-xl font-bold text-center text-white">
            Sales Report
          </Text>
          <Pressable onPress={fetchAnalytics}>
            <Ionicons name="refresh" size={24} color="white" />
          </Pressable>
        </View>
      </View>

      {/* Content */}
      <View className="flex-1 bg-white">
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingVertical: 20, paddingBottom: 100 }}
        >
          {/* Revenue & Orders */}
          <View className="flex-row justify-between mx-5 mb-4">
            <View className="flex-1 px-4 py-4 mr-2 bg-gray-200 shadow rounded-2xl">
              <Text className="text-sm font-semibold text-gray-600">
                Total Revenue
              </Text>
              <Text className="mt-1 text-lg font-bold text-blue-700">
                LKR {analytics.totalRevenue.toFixed(2)}
              </Text>
            </View>
            <View className="flex-1 px-4 py-4 ml-2 bg-gray-200 shadow rounded-2xl">
              <Text className="text-sm font-semibold text-gray-600">
                Total Orders
              </Text>
              <Text className="mt-1 text-lg font-bold text-gray-700">
                {analytics.totalOrders} Orders
              </Text>
            </View>
          </View>

          {/* This Month Sales */}
          <View className="px-4 py-4 mx-5 mb-4 bg-gray-300 shadow rounded-2xl">
            <Text className="text-sm font-semibold text-gray-600">
              This Month Sales:
            </Text>
            <Text className="mt-1 text-lg font-bold text-gray-800">
              LKR {analytics.thisMonthSales.toFixed(2)}
            </Text>
            <Text className="mt-1 text-xs text-gray-600">
              {analytics.thisMonthOrders} orders this month
            </Text>
          </View>

          {/* Monthly Sales Chart */}
          <View className="px-4 py-4 mx-5 mb-6 bg-white shadow rounded-2xl">
            <Text className="mb-3 text-base font-bold text-gray-900">
              Monthly Sales Chart (Last 6 Months)
            </Text>
            {formatChartData().length > 0 && formatChartData()[0].label !== "No Data" ? (
              <>
                <BarChart
                  data={formatChartData()}
                  barWidth={28}
                  spacing={16}
                  hideRules
                  frontColor="#4F46E5"
                  yAxisThickness={0}
                  xAxisThickness={0}
                />
                <Text className="mt-2 text-xs text-center text-gray-500">
                  Revenue in thousands (LKR)
                </Text>
              </>
            ) : (
              <View className="items-center justify-center py-8">
                <Text className="text-gray-500">No sales data available yet</Text>
              </View>
            )}
          </View>
        </ScrollView>

        {/* Footer Buttons - fixed at bottom */}
        <View className="absolute bottom-0 left-0 right-0 flex-row justify-between px-5 py-4 bg-white shadow">
          <Pressable
            className="flex-row items-center justify-center flex-1 p-4 mr-2 bg-orange-500 rounded-2xl"
            onPress={handleViewReport}
          >
            <MaterialCommunityIcons
              name="file-chart"
              size={20}
              color="white"
              style={{ marginRight: 6 }}
            />
            <Text className="text-base font-medium text-white">
              View Report
            </Text>
          </Pressable>

          <Pressable
            className={`flex-row items-center justify-center flex-1 p-4 ml-2 rounded-2xl ${generatingPDF ? 'bg-gray-400' : 'bg-orange-400'}`}
            onPress={handleDownloadPDF}
            disabled={generatingPDF}
          >
            {generatingPDF ? (
              <>
                <ActivityIndicator size="small" color="white" style={{ marginRight: 6 }} />
                <Text className="text-base font-medium text-white">
                  Generating...
                </Text>
              </>
            ) : (
              <>
                <MaterialCommunityIcons
                  name="download"
                  size={20}
                  color="white"
                  style={{ marginRight: 6 }}
                />
                <Text className="text-base font-medium text-white">
                  Download PDF
                </Text>
              </>
            )}
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}
