import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  ScrollView, 
  StyleSheet, 
  SafeAreaView,
  KeyboardAvoidingView,
  Platform 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const ChatWithUsScreen = ({ navigation }) => {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: "Hello! Welcome to DigiMarket support. How can I help you today?",
      isSupport: true,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const scrollViewRef = useRef();

  const quickReplies = [
    "Track my order",
    "Return an item",
    "Payment issue",
    "Account help",
    "Delivery problem"
  ];

  // Auto responses for demo
  const autoResponses = {
    "track my order": "I'd be happy to help you track your order. Please provide your order number (e.g., ORD1729845632) so I can look it up for you.",
    "return an item": "I can help you with returns. Items can be returned within 7 days of delivery. What item would you like to return?",
    "payment issue": "I'm sorry to hear about the payment issue. Can you describe what happened? Was the payment declined or charged incorrectly?",
    "account help": "I can help with account issues. Are you having trouble logging in, updating your profile, or something else?",
    "delivery problem": "Sorry about the delivery issue. Can you share your order number so I can check the delivery status and help resolve this?",
    "hello": "Hello! How can I assist you today?",
    "hi": "Hi there! What can I help you with?",
    "help": "I'm here to help! You can ask me about orders, returns, payments, delivery, or any other questions about DigiMarket."
  };

  const sendMessage = () => {
    if (message.trim()) {
      const newMessage = {
        id: messages.length + 1,
        text: message,
        isSupport: false,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, newMessage]);
      setMessage('');
      setIsTyping(true);

      // Simulate support response
      setTimeout(() => {
        const responseText = getAutoResponse(message.toLowerCase());
        const supportResponse = {
          id: messages.length + 2,
          text: responseText,
          isSupport: true,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        
        setMessages(prev => [...prev, supportResponse]);
        setIsTyping(false);
      }, 2000);
    }
  };

  const getAutoResponse = (userMessage) => {
    // Check for exact matches first
    if (autoResponses[userMessage]) {
      return autoResponses[userMessage];
    }

    // Check for partial matches
    for (const key in autoResponses) {
      if (userMessage.includes(key)) {
        return autoResponses[key];
      }
    }

    // Default response
    return "Thank you for your message. Our support team will get back to you shortly. Is there anything specific I can help you with right now?";
  };

  const sendQuickReply = (reply) => {
    setMessage(reply);
    setTimeout(() => sendMessage(), 100);
  };

  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [messages, isTyping]);

  const renderMessage = (msg) => (
    <View key={msg.id} style={[
      styles.messageContainer,
      msg.isSupport ? styles.supportMessage : styles.userMessage
    ]}>
      {msg.isSupport && (
        <View style={styles.supportAvatar}>
          <Ionicons name="headset" size={16} color="#FFFFFF" />
        </View>
      )}
      
      <View style={[
        styles.messageBubble,
        msg.isSupport ? styles.supportBubble : styles.userBubble
      ]}>
        <Text style={[
          styles.messageText,
          msg.isSupport ? styles.supportText : styles.userText
        ]}>
          {msg.text}
        </Text>
        <Text style={[
          styles.messageTime,
          msg.isSupport ? styles.supportTime : styles.userTime
        ]}>
          {msg.timestamp}
        </Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>Support Chat</Text>
          <Text style={styles.headerSubtitle}>Usually replies in minutes</Text>
        </View>
        <View style={styles.onlineIndicator}>
          <View style={styles.onlineDot} />
        </View>
      </View>

      <KeyboardAvoidingView 
        style={styles.chatContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Messages */}
        <ScrollView 
          ref={scrollViewRef}
          style={styles.messagesContainer}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.messagesContent}
        >
          {messages.map(renderMessage)}
          
          {isTyping && (
            <View style={[styles.messageContainer, styles.supportMessage]}>
              <View style={styles.supportAvatar}>
                <Ionicons name="headset" size={16} color="#FFFFFF" />
              </View>
              <View style={styles.typingBubble}>
                <Text style={styles.typingText}>Support is typing...</Text>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Quick Replies */}
        {messages.length <= 1 && (
          <View style={styles.quickRepliesContainer}>
            <Text style={styles.quickRepliesTitle}>Quick actions:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.quickReplies}>
                {quickReplies.map((reply, index) => (
                  <TouchableOpacity 
                    key={index}
                    style={styles.quickReplyButton}
                    onPress={() => sendQuickReply(reply)}
                  >
                    <Text style={styles.quickReplyText}>{reply}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
        )}

        {/* Message Input */}
        <View style={styles.inputContainer}>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.textInput}
              value={message}
              onChangeText={setMessage}
              placeholder="Type your message..."
              multiline
              maxLength={500}
            />
            <TouchableOpacity 
              style={[
                styles.sendButton,
                message.trim() ? styles.sendButtonActive : styles.sendButtonInactive
              ]}
              onPress={sendMessage}
              disabled={!message.trim()}
            >
              <Ionicons 
                name="send" 
                size={20} 
                color={message.trim() ? "#FFFFFF" : "#9CA3AF"} 
              />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
  },
  headerInfo: {
    flex: 1,
    marginLeft: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#10B981',
  },
  onlineIndicator: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  chatContainer: {
    flex: 1,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 20,
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  supportMessage: {
    justifyContent: 'flex-start',
  },
  userMessage: {
    justifyContent: 'flex-end',
  },
  supportAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#8B5CF6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  messageBubble: {
    maxWidth: '75%',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  supportBubble: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 4,
  },
  userBubble: {
    backgroundColor: '#8B5CF6',
    borderBottomRightRadius: 4,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 18,
  },
  supportText: {
    color: '#111827',
  },
  userText: {
    color: '#FFFFFF',
  },
  messageTime: {
    fontSize: 11,
    marginTop: 4,
  },
  supportTime: {
    color: '#6B7280',
  },
  userTime: {
    color: '#E5E7EB',
  },
  typingBubble: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderBottomLeftRadius: 4,
  },
  typingText: {
    fontSize: 14,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  quickRepliesContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  quickRepliesTitle: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 8,
  },
  quickReplies: {
    flexDirection: 'row',
  },
  quickReplyButton: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
  },
  quickReplyText: {
    fontSize: 12,
    color: '#374151',
  },
  inputContainer: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
    maxHeight: 80,
  },
  sendButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  sendButtonActive: {
    backgroundColor: '#8B5CF6',
  },
  sendButtonInactive: {
    backgroundColor: '#E5E7EB',
  },
});

export default ChatWithUsScreen;