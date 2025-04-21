import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { FileText, Mic, Plus, Clock } from 'lucide-react-native';

type Note = {
  id: string;
  title: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
};

const SAMPLE_NOTES: Note[] = [
  {
    id: '1',
    title: 'Project Ideas',
    content: 'Build a mobile app for task management with AI integration...',
    createdAt: new Date(2024, 1, 10),
    updatedAt: new Date(2024, 1, 10),
  },
  {
    id: '2',
    title: 'Meeting Notes',
    content: 'Discussed new feature requirements and timeline...',
    createdAt: new Date(2024, 1, 12),
    updatedAt: new Date(2024, 1, 13),
  },
  {
    id: '3',
    title: 'Book Recommendations',
    content: '1. Atomic Habits\n2. Deep Work\n3. The Psychology of Money',
    createdAt: new Date(2024, 1, 14),
    updatedAt: new Date(2024, 1, 14),
  },
];

export default function NotesScreen() {
  const [notes] = useState<Note[]>(SAMPLE_NOTES);
  const [isRecording, setIsRecording] = useState(false);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const handleVoiceInput = () => {
    setIsRecording(!isRecording);
    // Implement voice recording logic here
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#1a1a1a', '#2a1a2a']}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>Notes</Text>
        <Text style={styles.headerSubtitle}>Capture your thoughts</Text>

        <TouchableOpacity
          style={[styles.voiceButton, isRecording && styles.voiceButtonRecording]}
          onPress={handleVoiceInput}
        >
          <Mic size={24} color={isRecording ? '#ef4444' : '#9333ea'} />
          <Text style={[
            styles.voiceButtonText,
            isRecording && styles.voiceButtonTextRecording
          ]}>
            {isRecording ? 'Recording...' : 'Start Voice Note'}
          </Text>
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView style={styles.content}>
        {notes.map(note => (
          <TouchableOpacity key={note.id} style={styles.noteCard}>
            <View style={styles.noteHeader}>
              <FileText size={20} color="#9333ea" />
              <Text style={styles.noteTitle}>{note.title}</Text>
            </View>

            <Text style={styles.noteContent} numberOfLines={3}>
              {note.content}
            </Text>

            <View style={styles.noteFooter}>
              <View style={styles.timestampContainer}>
                <Clock size={14} color="#6b7280" />
                <Text style={styles.timestampText}>
                  {formatDate(note.updatedAt)}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <TouchableOpacity style={styles.addButton}>
        <Plus size={24} color="#ffffff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 20,
    paddingTop: Platform.OS === 'web' ? 20 : 40,
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#999999',
    marginBottom: 16,
  },
  voiceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(147, 51, 234, 0.1)',
    padding: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  voiceButtonRecording: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  voiceButtonText: {
    color: '#9333ea',
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    marginLeft: 12,
  },
  voiceButtonTextRecording: {
    color: '#ef4444',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  noteCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  noteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  noteTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#1f2937',
    marginLeft: 12,
    flex: 1,
  },
  noteContent: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#4b5563',
    lineHeight: 20,
    marginBottom: 12,
  },
  noteFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  timestampContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timestampText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6b7280',
  },
  addButton: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#9333ea',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#9333ea',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
  },
});