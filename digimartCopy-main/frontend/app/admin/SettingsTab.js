import {
  Bell,
  Camera,
  Database,
  Edit,
  Globe,
  HelpCircle,
  Key,
  Lock,
  Mail,
  Settings as SettingsIcon,
  Smartphone,
  User,
  UserCircle,
} from "lucide-react-native";
import React from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";

const SettingsTab = () => {
  return (
    <ScrollView
      className="px-4 pt-4 pb-6"
      showsVerticalScrollIndicator={false}
    >
      {/* Profile Management */}
      <View className="p-5 mb-5 bg-white shadow-md rounded-2xl">
        <Text className="mb-4 text-xl font-bold text-gray-900">
          Profile Management
        </Text>

        {/* Profile Card */}
        <View className="p-4 mb-4 border border-gray-200 bg-gray-50 rounded-xl">
          <View className="flex-row items-center space-x-4">
            <View className="relative">
              <UserCircle size={60} color="#FF8C00" />
              <TouchableOpacity className="absolute bottom-0 right-0 items-center justify-center w-6 h-6 bg-orange-500 border-2 border-white rounded-full">
                <Camera size={14} color="#FFF" />
              </TouchableOpacity>
            </View>

            <View className="flex-1">
              <Text className="text-lg font-bold text-gray-900">
                Admin User
              </Text>
              <Text className="text-sm text-gray-600">admin@company.com</Text>
              <Text className="text-xs font-semibold text-orange-600 bg-orange-50 px-2 py-0.5 rounded self-start mt-1">
                Super Administrator
              </Text>
            </View>

            <TouchableOpacity className="p-2 border border-yellow-400 rounded-md bg-orange-50">
              <Edit size={16} color="#FF8C00" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Profile Settings */}
        {[
          { icon: User, label: "Personal Information", value: "Edit →" },
          { icon: Key, label: "Change Password", value: "Update →" },
          { icon: Mail, label: "Email Preferences", value: "Configure →" },
          { icon: Lock, label: "Privacy Settings", value: "Manage →" },
        ].map(({ icon: Icon, label, value }, i) => (
          <TouchableOpacity
            key={i}
            className="flex-row items-center justify-between py-3 border-b border-gray-100"
          >
            <View className="flex-row items-center space-x-3">
              <Icon size={20} color="#6B7280" />
              <Text className="text-base font-medium text-gray-700">
                {label}
              </Text>
            </View>
            <Text className="text-sm font-medium text-gray-500">{value}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* General Settings */}
      <View className="p-5 mb-5 bg-white shadow-md rounded-2xl">
        <Text className="mb-4 text-xl font-bold text-gray-900">
          General Settings
        </Text>

        {[
          { icon: SettingsIcon, label: "App Configuration", value: "Configure →" },
          { icon: Globe, label: "Language & Region", value: "English (US) →" },
          { icon: Smartphone, label: "Mobile App Settings", value: "Manage →" },
        ].map(({ icon: Icon, label, value }, i) => (
          <TouchableOpacity
            key={i}
            className="flex-row items-center justify-between py-3 border-b border-gray-100"
          >
            <View className="flex-row items-center space-x-3">
              <Icon size={20} color="#6B7280" />
              <Text className="text-base font-medium text-gray-700">
                {label}
              </Text>
            </View>
            <Text className="text-sm font-medium text-gray-500">{value}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Notifications */}
      <View className="p-5 mb-5 bg-white shadow-md rounded-2xl">
        <Text className="mb-4 text-xl font-bold text-gray-900">
          Notifications
        </Text>

        {[
          { icon: Bell, label: "Push Notifications", value: "Enabled →" },
          { icon: Mail, label: "Email Notifications", value: "Weekly →" },
        ].map(({ icon: Icon, label, value }, i) => (
          <TouchableOpacity
            key={i}
            className="flex-row items-center justify-between py-3 border-b border-gray-100"
          >
            <View className="flex-row items-center space-x-3">
              <Icon size={20} color="#6B7280" />
              <Text className="text-base font-medium text-gray-700">
                {label}
              </Text>
            </View>
            <Text className="text-sm font-medium text-gray-500">{value}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Security */}
      <View className="p-5 mb-5 bg-white shadow-md rounded-2xl">
        <Text className="mb-4 text-xl font-bold text-gray-900">
          Security & Privacy
        </Text>

        {[
          { label: "Two-Factor Authentication", value: "Enabled →" },
          { label: "Password Policy", value: "Strong →" },
          { label: "Session Management", value: "30 min →" },
        ].map(({ label, value }, i) => (
          <TouchableOpacity
            key={i}
            className="flex-row items-center justify-between py-3 border-b border-gray-100"
          >
            <View className="flex-row items-center space-x-3">
              <Lock size={20} color="#6B7280" />
              <Text className="text-base font-medium text-gray-700">
                {label}
              </Text>
            </View>
            <Text className="text-sm font-medium text-gray-500">{value}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* System */}
      <View className="p-5 mb-5 bg-white shadow-md rounded-2xl">
        <Text className="mb-4 text-xl font-bold text-gray-900">System</Text>

        {[
          { label: "Database Management", value: "Healthy →" },
          { label: "Backup & Recovery", value: "Auto →" },
          { label: "System Logs", value: "View →" },
        ].map(({ label, value }, i) => (
          <TouchableOpacity
            key={i}
            className="flex-row items-center justify-between py-3 border-b border-gray-100"
          >
            <View className="flex-row items-center space-x-3">
              <Database size={20} color="#6B7280" />
              <Text className="text-base font-medium text-gray-700">
                {label}
              </Text>
            </View>
            <Text className="text-sm font-medium text-gray-500">{value}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Support & Help */}
      <View className="p-5 mb-5 bg-white shadow-md rounded-2xl">
        <Text className="mb-4 text-xl font-bold text-gray-900">
          Support & Help
        </Text>

        {[
          { icon: HelpCircle, label: "Help Center", value: "Open →" },
          { icon: Mail, label: "Contact Support", value: "Email →" },
          { icon: HelpCircle, label: "Documentation", value: "View →" },
        ].map(({ icon: Icon, label, value }, i) => (
          <TouchableOpacity
            key={i}
            className="flex-row items-center justify-between py-3 border-b border-gray-100"
          >
            <View className="flex-row items-center space-x-3">
              <Icon size={20} color="#6B7280" />
              <Text className="text-base font-medium text-gray-700">
                {label}
              </Text>
            </View>
            <Text className="text-sm font-medium text-gray-500">{value}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Danger Zone */}
      <View className="p-5 mb-5 bg-white border border-red-200 shadow-sm rounded-2xl">
        <Text className="mb-4 text-xl font-bold text-red-600">⚠️ Danger Zone</Text>

        {[
          { icon: Database, label: "Reset Database", value: "Reset →" },
          { icon: Lock, label: "Factory Reset", value: "Reset →" },
        ].map(({ icon: Icon, label, value }, i) => (
          <TouchableOpacity
            key={i}
            className="flex-row items-center justify-between px-2 py-3 mb-1 border-b border-gray-100 rounded-lg bg-red-50"
          >
            <View className="flex-row items-center space-x-3">
              <Icon size={20} color="#EF4444" />
              <Text className="text-base font-semibold text-red-600">
                {label}
              </Text>
            </View>
            <Text className="text-sm font-semibold text-red-600">{value}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* App Information */}
      <View className="p-5 bg-white shadow-md rounded-2xl">
        <Text className="mb-4 text-xl font-bold text-gray-900">
          App Information
        </Text>

        {[
          ["Version:", "2.1.4"],
          ["Build:", "2024.10.02"],
          ["Environment:", "Production"],
          ["Last Update:", "Oct 1, 2024"],
        ].map(([label, value], i) => (
          <View
            key={i}
            className="flex-row justify-between py-2 border-b border-gray-100"
          >
            <Text className="text-base font-semibold text-gray-800">
              {label}
            </Text>
            <Text className="text-base text-gray-600">{value}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
};

export default SettingsTab;
