import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, Platform, Modal,AppState } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { Menu, Calendar, Bell, FileText, SquareCheck as CheckSquare, X } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { getAuth } from 'firebase/auth';
import { DatabaseService } from '@/services/database';
import type { User, Appointment, Reminder } from '@/types/database';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';


export default function HomePage() {
  const { t } = useTranslation();
  const [showMenu, setShowMenu] = useState(false);
  const [showAppointments, setShowAppointments] = useState(false);
  const [showReminders, setShowReminders] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [motivationalPhrase, setMotivationalPhrase] = useState<string>('');

 useFocusEffect(
  React.useCallback(() => {
    let isActive = true;

    const loadUserData = async () => {
      const auth = getAuth();
      if (!auth.currentUser) return;

      const userData = await DatabaseService.getUser(auth.currentUser.uid);
      const userAppointments = await DatabaseService.getUserAppointments(auth.currentUser.uid);
      const userReminders = await DatabaseService.getUserReminders(auth.currentUser.uid);

      if (isActive) {
        setUser(userData);
        setAppointments(userAppointments);
        setReminders(userReminders);
      }
    };

    loadUserData();

    return () => {
      isActive = false;
    };
  }, []) // still valid here – because Firebase Auth and DatabaseService are stable
);


  const renderHeader = () => (
    <View style={styles.header}>
      <View>
        <Text style={styles.headerTitle}>PRONTO</Text>
        <Text style={styles.headerSubtitle}>Your Personal Assistant</Text>
      </View>
      <TouchableOpacity
        style={styles.menuButton}
        onPress={() => setShowMenu(true)}
      >
        <Menu color="#ffffff" size={24} />
      </TouchableOpacity>
    </View>
  );

  const renderMotivationalBanner = () => (
    <LinearGradient
      colors={['rgba(147, 51, 234, 0.1)', 'rgba(147, 51, 234, 0.05)']}
      style={styles.motivationalBanner}
    >
      <Text style={styles.motivationalText}>
        {motivationalPhrase || "Believe in yourself and all that you are."}
      </Text>
    </LinearGradient>
  );

  const renderSchedule = () => (
    <View style={styles.scheduleSection}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Today's Schedule</Text>
        <TouchableOpacity style={styles.weekViewButton}>
          <Calendar size={18} color="#9333ea" />
        </TouchableOpacity>
      </View>
      
      <View style={styles.scheduleBanners}>
        {/* Appointments Banner */}
        <TouchableOpacity 
          style={styles.scheduleBanner}
          onPress={() => setShowAppointments(true)}
        >
          <View style={styles.bannerHeader}>
            <Calendar size={18} color="#9333ea" />
            <Text style={styles.bannerTitle}>{t('home.appointments')}</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{appointments.length}</Text>
            </View>
          </View>
        
          <ScrollView 
            style={styles.eventList} 
            showsVerticalScrollIndicator={false}
            pointerEvents="none"
             pinchGestureEnabled={false} 
          >
            {appointments.map((appointment, index) => (
              <View key={index} style={styles.eventItem}>
                <Text style={styles.eventTime}>{appointment.time}</Text>
                <Text style={styles.eventName} numberOfLines={1}>
                  {appointment.appointmentName}
                </Text>
              </View>
            ))}
          </ScrollView>
        </TouchableOpacity>

        {/* Reminders Banner */}
        <TouchableOpacity 
          style={styles.scheduleBanner}
          onPress={() => setShowReminders(true)}
        >
          <View style={styles.bannerHeader}>
            <Bell size={18} color="#9333ea" />
            <Text style={styles.bannerTitle}>{t('menu.reminders')}</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{reminders.length}</Text>
            </View>
          </View>
          
          <ScrollView 
            style={styles.eventList} 
            showsVerticalScrollIndicator={false}
             pinchGestureEnabled={false} 
            pointerEvents="none"
          >
            {reminders.map((reminder, index) => (
              <View key={index} style={styles.eventItem}>
                <Text style={styles.eventTime}>{reminder.time}</Text>
                <Text style={styles.eventName} numberOfLines={1}>
                  {reminder.reminderName}
                </Text>
              </View>
            ))}
          </ScrollView>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderExpandedList = (
    title: string,
    icon: typeof Calendar | typeof Bell,
    items: Appointment[] | Reminder[],
    onClose: () => void
  ) => (
    <Modal
      visible={true}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <View style={styles.modalHeaderLeft}>
              {icon === Calendar ? (
                <Calendar size={20} color="#9333ea" />
              ) : (
                <Bell size={20} color="#9333ea" />
              )}
              <Text style={styles.modalTitle}>{title}</Text>
            </View>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={onClose}
            >
              <X size={20} color="#ffffff" />
            </TouchableOpacity>
          </View>

          <ScrollView 
            style={styles.modalList}
            showsVerticalScrollIndicator={false}
             pinchGestureEnabled={false} 
          >
            {items.map((item, index) => (
              <View key={index} style={styles.modalItem}>
                <Text style={styles.modalItemTime}>
                  {(item as any).time}
                </Text>
                <View style={styles.modalItemContent}>
                  <Text style={styles.modalItemTitle}>
                    {(item as any).appointmentName || (item as any).reminderName}
                  </Text>
                  {'description' in item && (
                    <Text style={styles.modalItemDescription}>
                      {item.description}
                    </Text>
                  )}
                </View>
              </View>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  const renderContent = () => (
    <View style={styles.tabContent}>
      <Text style={styles.comingSoonText}>Tasks coming soon</Text>
    </View>
  );

  const renderMenu = () => {
    if (!showMenu) return null;

    return (
      <View style={StyleSheet.absoluteFill}>
        <BlurView intensity={80} style={StyleSheet.absoluteFill} tint="dark">
          <View style={styles.menuContent}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowMenu(false)}
            >
              <Menu color="#ffffff" size={24} />
            </TouchableOpacity>

            <View style={styles.profileSection}>
              <Image
                source={{ uri: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=800&auto=format&fit=crop&q=80' }}
                style={styles.profileImage}
              />
              <Text style={styles.profileName}>{user?.name || 'User'}</Text>
              <Text style={styles.profileEmail}>{user?.email}</Text>
            </View>
          </View>
        </BlurView>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#1a1a1a', '#2a1a2a']}
        style={styles.background}
      >
        <View style={styles.upperContent}>
          {renderHeader()}
          {renderMotivationalBanner()}
          {renderSchedule()}
        </View>

        <View style={styles.lowerContent}>
          {renderContent()}
        </View>

        {showAppointments && renderExpandedList(
          'Appointments',
          Calendar,
          appointments,
          () => setShowAppointments(false)
        )}

        {showReminders && renderExpandedList(
          'Reminders',
          Bell,
          reminders,
          () => setShowReminders(false)
        )}

        {renderMenu()}
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    flex: 1,
  },
  upperContent: {
    flex: 1,
    maxHeight: '45%',
  },
  lowerContent: {
    flex: 1,
    justifyContent: 'flex-start',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'web' ? 16 : 40,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#ffffff',
    letterSpacing: 1,
  },
  headerSubtitle: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#9ca3af',
    marginTop: 1,
  },
  menuButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  motivationalBanner: {
    marginHorizontal: 16,
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  motivationalText: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#ffffff',
    textAlign: 'center',
    lineHeight: 18,
    letterSpacing: 0.2,
  },
  scheduleSection: {
    flex: 1,
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#ffffff',
    letterSpacing: 0.3,
  },
  weekViewButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(147, 51, 234, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scheduleBanners: {
    flex: 1,
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
  },
  scheduleBanner: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 12,
  },
  bannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  bannerTitle: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#ffffff',
    marginLeft: 8,
    flex: 1,
    letterSpacing: 0.2,
  },
  badge: {
    backgroundColor: '#9333ea',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  badgeText: {
    fontSize: 11,
    fontFamily: 'Inter-SemiBold',
    color: '#ffffff',
  },
  eventList: {
    flex: 1,
  },
  eventItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    padding: 8,
    borderRadius: 10,
  },
  eventTime: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#9333ea',
    width: 45,
  },
  eventName: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#ffffff',
    flex: 1,
    marginLeft: 8,
  },
  tabContent: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 16,
  },
  comingSoonText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666666',
    letterSpacing: 0.3,
  },
  menuContent: {
    flex: 1,
    padding: 16,
  },
  closeButton: {
    alignSelf: 'flex-end',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileSection: {
    alignItems: 'center',
    marginTop: 32,
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 16,
  },
  profileName: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#ffffff',
    marginBottom: 2,
    letterSpacing: 0.5,
  },
  profileEmail: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#9ca3af',
    letterSpacing: 0.2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
    width: '100%',
    maxWidth: 500,
    maxHeight: '80%',
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalList: {
    flex: 1,
  },
  modalItem: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    marginBottom: 8,
  },
  modalItemTime: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#9333ea',
    width: 50,
  },
  modalItemContent: {
    flex: 1,
    marginLeft: 12,
  },
  modalItemTitle: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#ffffff',
    marginBottom: 4,
  },
  modalItemDescription: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#9ca3af',
    lineHeight: 18,
  },
});