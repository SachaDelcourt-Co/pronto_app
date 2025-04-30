import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, TextInput, Modal, ActivityIndicator, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { FileText, Folder as FolderIcon, Plus, Clock, ChevronRight, X, ArrowLeft, Edit, Trash2, CheckSquare, Square } from 'lucide-react-native';
import { useAuth } from '@/utils/AuthContext';
import { DatabaseService } from '@/services/database';
import type { Note, Folder } from '@/types/database';
import { useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';

// Regex pattern to match checkbox syntax: "- [ ]" for unchecked, "- [x]" for checked
const CHECKBOX_REGEX = /^(\s*)- \[([ x])\] (.*)$/gm;

// Function to parse note content and render checkboxes
const renderNoteWithCheckboxes = (content: string, onToggleCheckbox?: (text: string) => void) => {
  if (!content) return null;
  
  // Split content by lines
  const lines = content.split('\n');
  
  return lines.map((line, index) => {
    // Check if the line matches checkbox pattern
    const match = /^(\s*)- \[([ x])\] (.*)$/.exec(line);
    
    if (match) {
      const [_, indentation, checkState, text] = match;
      const isChecked = checkState === 'x';
      
      return (
        <TouchableOpacity 
          key={index}
          style={styles.checkboxLine}
          onPress={() => onToggleCheckbox && onToggleCheckbox(line)}
          disabled={!onToggleCheckbox}
        >
          <View style={styles.checkboxContainer}>
            {isChecked ? (
              <CheckSquare size={18} color="#9333ea" />
            ) : (
              <Square size={18} color="#9333ea" />
            )}
            <Text style={[
              styles.checkboxText,
              isChecked && styles.checkedText
            ]}>
              {text}
            </Text>
          </View>
        </TouchableOpacity>
      );
    } else {
      // Return regular text for non-checkbox lines
      return (
        <Text key={index} style={styles.viewNoteContent}>
          {line}
        </Text>
      );
    }
  });
};

// Function to toggle checkbox state in text
const toggleCheckbox = (text: string, line: string): string => {
  return text.replace(line, line.indexOf('- [ ]') !== -1 
    ? line.replace('- [ ]', '- [x]') 
    : line.replace('- [x]', '- [ ]')
  );
};

// Add a helper function to render note preview with checkboxes near the renderNoteWithCheckboxes function
const renderNotePreview = (content: string) => {
  if (!content) return null;
  
  // Split content by lines
  const lines = content.split('\n');
  
  // Join first 3 lines with properly rendered checkboxes
  return lines.slice(0, 3).map((line, index) => {
    // Check if the line matches checkbox pattern
    const match = /^(\s*)- \[([ x])\] (.*)$/.exec(line);
    
    if (match) {
      const [_, indentation, checkState, text] = match;
      const isChecked = checkState === 'x';
      
      return (
        <View key={index} style={styles.previewCheckboxLine}>
          {isChecked ? (
            <CheckSquare size={14} color="#9333ea" />
          ) : (
            <Square size={14} color="#9333ea" />
          )}
          <Text 
            style={[
              styles.previewCheckboxText,
              isChecked && styles.previewCheckedText
            ]}
            numberOfLines={1}
          >
            {text}
          </Text>
        </View>
      );
    } else {
      // Return regular text for non-checkbox lines
      return (
        <Text key={index} style={styles.noteContent} numberOfLines={1}>
          {line}
        </Text>
      );
    }
  });
};

export default function NotesScreen() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [currentFolder, setCurrentFolder] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Modal states
  const [showCreateNoteModal, setShowCreateNoteModal] = useState(false);
  const [showCreateFolderModal, setShowCreateFolderModal] = useState(false);
  const [showEditNoteModal, setShowEditNoteModal] = useState(false);
  const [showViewNoteModal, setShowViewNoteModal] = useState(false);
  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [newNoteContent, setNewNoteContent] = useState('');
  const [newFolderName, setNewFolderName] = useState('');
  const [selectedFolderForNote, setSelectedFolderForNote] = useState<string | null>(null);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [viewingNote, setViewingNote] = useState<Note | null>(null);
  
  // Loading and deletion states
  const [isSaving, setIsSaving] = useState(false);
  const [deletingNoteId, setDeletingNoteId] = useState<string | null>(null);
  const [deletingFolderId, setDeletingFolderId] = useState<string | null>(null);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [deleteItemType, setDeleteItemType] = useState<'note' | 'folder' | null>(null);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [deleteItemName, setDeleteItemName] = useState('');

  // Load data when the screen is focused
  useFocusEffect(
    React.useCallback(() => {
      if (user) {
        loadData();
      } else {
        // Immediately stop loading if no user is available
        setIsLoading(false);
      }
      return () => {
        // Cleanup
      };
    }, [user, currentFolder])
  );

  const loadData = async () => {
    try {
      setIsLoading(true);
      
      if (!user) {
        setIsLoading(false);
        return;
      }
      
      // Load folders
      const userFolders = await DatabaseService.getUserFolders(user.uid);
      setFolders(userFolders);
      
      // Load notes based on current folder
      const userNotes = await DatabaseService.getUserNotes(user.uid, currentFolder);
      console.log(`Loaded ${userNotes.length} notes for current folder:`, currentFolder);
      setNotes(userNotes);
      
      setIsLoading(false);
    } catch (error) {
      console.error('Error loading notes data:', error);
      setIsLoading(false);
    }
  };

  const handleCreateNote = async () => {
    if (!newNoteTitle.trim()) return;
    if (!user) return;
    
    try {
      setIsSaving(true);
      
      await DatabaseService.createNote({
        userID: user.uid,
        title: newNoteTitle.trim(),
        content: newNoteContent.trim(),
        folderID: selectedFolderForNote,
        createdAt: new Date(),
      });
      
      // Reset form and close modal
      setNewNoteTitle('');
      setNewNoteContent('');
      setSelectedFolderForNote(currentFolder);
      setShowCreateNoteModal(false);
      
      // Reload notes
      await loadData();
    } catch (error) {
      console.error('Error creating note:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditNote = async () => {
    if (!editingNote || !editingNote.noteID || !newNoteTitle.trim()) return;
    
    try {
      setIsSaving(true);
      
      await DatabaseService.updateNote(editingNote.noteID, {
        title: newNoteTitle.trim(),
        content: newNoteContent.trim(),
        folderID: selectedFolderForNote,
      });
      
      // Reset form and close modal
      setEditingNote(null);
      setNewNoteTitle('');
      setNewNoteContent('');
      setShowEditNoteModal(false);
      
      // Reload notes
      await loadData();
    } catch (error) {
      console.error('Error updating note:', error);
    } finally {
      setIsSaving(false);
    }
  };
  
  const openEditNoteModal = (note: Note) => {
    setEditingNote(note);
    setNewNoteTitle(note.title);
    setNewNoteContent(note.content);
    setSelectedFolderForNote(note.folderID || null);
    setShowEditNoteModal(true);
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    if (!user) return;
    
    try {
      setIsSaving(true);
      
      await DatabaseService.createFolder({
        userID: user.uid,
        folderName: newFolderName.trim(),
        createdAt: new Date(),
      });
      
      // Reset form and close modal
      setNewFolderName('');
      setShowCreateFolderModal(false);
      
      // Reload folders
      await loadData();
    } catch (error) {
      console.error('Error creating folder:', error);
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleDeleteNote = async (noteId: string, noteName: string) => {
    // Show delete confirmation dialog
    setDeleteItemType('note');
    setItemToDelete(noteId);
    setDeleteItemName(noteName);
    setShowDeleteConfirmation(true);
  };
  
  const handleDeleteFolder = async (folderId: string, folderName: string) => {
    // Show delete confirmation dialog
    setDeleteItemType('folder');
    setItemToDelete(folderId);
    setDeleteItemName(folderName);
    setShowDeleteConfirmation(true);
  };
  
  const confirmDelete = async () => {
    if (!itemToDelete || !deleteItemType) return;
    
    try {
      if (deleteItemType === 'note') {
        setDeletingNoteId(itemToDelete);
        await DatabaseService.deleteNote(itemToDelete);
      } else if (deleteItemType === 'folder') {
        setDeletingFolderId(itemToDelete);
        await DatabaseService.deleteFolder(itemToDelete);
      }
      
      // Reload data
      await loadData();
    } catch (error) {
      console.error(`Error deleting ${deleteItemType}:`, error);
    } finally {
      // Reset state
      setDeletingNoteId(null);
      setDeletingFolderId(null);
      setShowDeleteConfirmation(false);
      setDeleteItemType(null);
      setItemToDelete(null);
      setDeleteItemName('');
    }
  };
  
  const cancelDelete = () => {
    setShowDeleteConfirmation(false);
    setDeleteItemType(null);
    setItemToDelete(null);
    setDeleteItemName('');
  };

  const navigateToFolder = (folderId: string) => {
    setCurrentFolder(folderId);
  };

  const navigateToRoot = () => {
    setCurrentFolder(null);
  };

  const formatDate = (date: Date) => {
    const options: Intl.DateTimeFormatOptions = {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    };
    
    // Use the current language from i18n instead of hardcoded 'en-US'
    const currentLanguage = i18n.language;
    let locale = currentLanguage;
    
    // Map languages to locales if needed
    if (currentLanguage === 'fr') locale = 'fr-FR';
    else if (currentLanguage === 'en') locale = 'en-US';
    else if (currentLanguage === 'nl') locale = 'nl-NL';
    else if (currentLanguage === 'es') locale = 'es-ES';
    else if (currentLanguage === 'pt') locale = 'pt-PT';
    else if (currentLanguage === 'it') locale = 'it-IT';
    
    return date.toLocaleDateString(locale, options);
  };

  const openViewNoteModal = (note: Note) => {
    setViewingNote(note);
    setShowViewNoteModal(true);
  };

  const handleToggleCheckbox = async (line: string) => {
    if (viewingNote && viewingNote.noteID) {
      const updatedContent = toggleCheckbox(viewingNote.content, line);
      
      try {
        // Update note in database
        await DatabaseService.updateNote(viewingNote.noteID, {
          content: updatedContent
        });
        
        // Update local state with the updated note and current timestamp
        setViewingNote({
          ...viewingNote,
          content: updatedContent,
          updatedAt: new Date() // Update the timestamp to reflect the change
        });
        
        // Refresh notes list to show updated content in the note preview
        loadData();
      } catch (error) {
        console.error('Error updating checkbox state:', error);
      }
    }
  };

  const renderCreateNoteModal = () => {
    return (
      <Modal
        visible={showCreateNoteModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCreateNoteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('notes.createNote')}</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowCreateNoteModal(false)}
              >
                <X size={20} color="#666666" />
              </TouchableOpacity>
            </View>

            <Text style={styles.contentInputLabel}>{t('notes.noteName')}</Text>
            <TextInput
              style={styles.titleInput}
              placeholder={t('notes.noteName')}
              placeholderTextColor="#999999"
              value={newNoteTitle}
              onChangeText={setNewNoteTitle}
            />

            <View style={styles.contentHeaderContainer}>
              <Text style={styles.contentInputLabel}>{t('notes.content')}</Text>
              <TouchableOpacity
                style={styles.addCheckboxButton}
                onPress={() => {
                  setNewNoteContent(newNoteContent + '\n- [ ] ');
                }}
              >
                <CheckSquare size={16} color="#22c55e" />
                <Text style={styles.addCheckboxText}>{t('notes.addCheckbox')}</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.contentInput}
              placeholder={t('notes.content')}
              placeholderTextColor="#999999"
              value={newNoteContent}
              onChangeText={setNewNoteContent}
              multiline
              textAlignVertical="top"
            />
            <Text style={styles.markdownHint}>* {t('notes.markdownHint')}</Text>

            <View style={styles.folderSelector}>
              <Text style={styles.folderSelectorLabel}>{t('notes.selectFolder')}:</Text>
              <View style={styles.folderOptions}>
                <TouchableOpacity
                  style={[
                    styles.folderOption,
                    selectedFolderForNote === null && styles.folderOptionSelected
                  ]}
                  onPress={() => setSelectedFolderForNote(null)}
                >
                  <Text style={[
                    styles.folderOptionText,
                    selectedFolderForNote === null && styles.folderOptionTextSelected
                  ]}>{t('notes.root')}</Text>
                </TouchableOpacity>
                
                {folders
                  .filter(folder => folder.folderID !== undefined)
                  .map(folder => (
                    <TouchableOpacity
                      key={folder.folderID}
                      style={[
                        styles.folderOption,
                        selectedFolderForNote === folder.folderID && styles.folderOptionSelected
                      ]}
                      onPress={() => setSelectedFolderForNote(folder.folderID as string)}
                    >
                      <Text style={[
                        styles.folderOptionText,
                        selectedFolderForNote === folder.folderID && styles.folderOptionTextSelected
                      ]}>{folder.folderName}</Text>
                    </TouchableOpacity>
                  ))
                }
              </View>
            </View>

            <TouchableOpacity
              style={[styles.saveButton, (!newNoteTitle.trim() || isSaving) && styles.saveButtonDisabled]}
              onPress={handleCreateNote}
              disabled={!newNoteTitle.trim() || isSaving}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.saveButtonText}>{t('notes.save')}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };
  
  const renderEditNoteModal = () => {
    return (
      <Modal
        visible={showEditNoteModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowEditNoteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('notes.editNote')}</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowEditNoteModal(false)}
              >
                <X size={20} color="#666666" />
              </TouchableOpacity>
            </View>

            <Text style={styles.contentInputLabel}>{t('notes.noteName')}</Text>
            <TextInput
              style={styles.titleInput}
              placeholder={t('notes.noteName')}
              placeholderTextColor="#999999"
              value={newNoteTitle}
              onChangeText={setNewNoteTitle}
            />

            <View style={styles.contentHeaderContainer}>
              <Text style={styles.contentInputLabel}>{t('notes.content')}</Text>
              <TouchableOpacity
                style={styles.addCheckboxButton}
                onPress={() => {
                  setNewNoteContent(newNoteContent + '\n- [ ] ');
                }}
              >
                <CheckSquare size={16} color="#22c55e" />
                <Text style={styles.addCheckboxText}>{t('notes.addCheckbox')}</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.largeContentInput}
              placeholder={t('notes.content')}
              placeholderTextColor="#999999"
              value={newNoteContent}
              onChangeText={setNewNoteContent}
              multiline
              textAlignVertical="top"
            />
            <Text style={styles.markdownHint}>* {t('notes.markdownHint')}</Text>

            <View style={styles.folderSelector}>
              <Text style={styles.folderSelectorLabel}>{t('notes.selectFolder')}:</Text>
              <View style={styles.folderOptions}>
                <TouchableOpacity
                  style={[
                    styles.folderOption,
                    selectedFolderForNote === null && styles.folderOptionSelected
                  ]}
                  onPress={() => setSelectedFolderForNote(null)}
                >
                  <Text style={[
                    styles.folderOptionText,
                    selectedFolderForNote === null && styles.folderOptionTextSelected
                  ]}>{t('notes.root')}</Text>
                </TouchableOpacity>
                
                {folders
                  .filter(folder => folder.folderID !== undefined)
                  .map(folder => (
                    <TouchableOpacity
                      key={folder.folderID}
                      style={[
                        styles.folderOption,
                        selectedFolderForNote === folder.folderID && styles.folderOptionSelected
                      ]}
                      onPress={() => setSelectedFolderForNote(folder.folderID as string)}
                    >
                      <Text style={[
                        styles.folderOptionText,
                        selectedFolderForNote === folder.folderID && styles.folderOptionTextSelected
                      ]}>{folder.folderName}</Text>
                    </TouchableOpacity>
                  ))
                }
              </View>
            </View>

            <TouchableOpacity
              style={[styles.saveButton, (!newNoteTitle.trim() || isSaving) && styles.saveButtonDisabled]}
              onPress={handleEditNote}
              disabled={!newNoteTitle.trim() || isSaving}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.saveButtonText}>{t('notes.update')}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

  const renderCreateFolderModal = () => {
    return (
      <Modal
        visible={showCreateFolderModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCreateFolderModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('notes.createFolder')}</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowCreateFolderModal(false)}
              >
                <X size={20} color="#666666" />
              </TouchableOpacity>
            </View>

            <Text style={styles.contentInputLabel}>{t('notes.folderName')}</Text>
            <TextInput
              style={styles.titleInput}
              placeholder={t('notes.folderName')}
              placeholderTextColor="#999999"
              value={newFolderName}
              onChangeText={setNewFolderName}
            />

            <TouchableOpacity
              style={[styles.saveButton, (!newFolderName.trim() || isSaving) && styles.saveButtonDisabled]}
              onPress={handleCreateFolder}
              disabled={!newFolderName.trim() || isSaving}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.saveButtonText}>{t('notes.create')}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };
  
  const renderDeleteConfirmationModal = () => {
    return (
      <Modal
        visible={showDeleteConfirmation}
        transparent
        animationType="fade"
        onRequestClose={cancelDelete}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.confirmModalContent}>
            <Text style={styles.confirmModalTitle}>{t('notes.deleteConfirmationTitle')}</Text>
            <Text style={styles.confirmModalText}>
              {deleteItemType === 'note' 
                ? t('notes.deleteConfirmation') 
                : t('notes.deleteFolderConfirmation')}
            </Text>
            
            <View style={styles.confirmModalButtons}>
              <TouchableOpacity
                style={[styles.confirmModalButton, styles.confirmModalCancelButton]}
                onPress={cancelDelete}
              >
                <Text style={styles.confirmModalCancelText}>{t('notes.cancel')}</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.confirmModalButton, styles.confirmModalDeleteButton]}
                onPress={confirmDelete}
              >
                <Text style={styles.confirmModalDeleteText}>{t('notes.delete')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  const renderViewNoteModal = () => {
    if (!viewingNote) return null;
    
    return (
      <Modal
        visible={showViewNoteModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowViewNoteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('notes.noteDetails')}: {viewingNote.title}</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowViewNoteModal(false)}
              >
                <X size={20} color="#666666" />
              </TouchableOpacity>
            </View>

            <View style={styles.viewNoteContainer}>
              <ScrollView style={styles.viewNoteScrollContainer}>
                {renderNoteWithCheckboxes(viewingNote.content, handleToggleCheckbox)}
              </ScrollView>
            </View>
            
            <View style={styles.viewNoteFooter}>
              <View style={styles.viewNoteTimestamp}>
                <Clock size={16} color="#6b7280" />
                <Text style={styles.viewNoteTimestampText}>
                  {t('notes.lastUpdated')} {formatDate(viewingNote.updatedAt)}
                </Text>
              </View>
              
              <View style={styles.viewNoteActions}>
                <TouchableOpacity
                  style={styles.viewNoteActionButton}
                  onPress={() => {
                    setShowViewNoteModal(false);
                    openEditNoteModal(viewingNote);
                  }}
                >
                  <Edit size={18} color="#9333ea" />
                  <Text style={styles.viewNoteActionText}>{t('notes.edit')}</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.viewNoteActionButton, styles.viewNoteDeleteButton]}
                  onPress={() => {
                    setShowViewNoteModal(false);
                    handleDeleteNote(viewingNote.noteID as string, viewingNote.title);
                  }}
                >
                  <Trash2 size={18} color="#ef4444" />
                  <Text style={styles.viewNoteDeleteText}>{t('notes.delete')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  const renderFolderPath = () => {
    if (currentFolder === null) {
      return null;
    }

    const folder = folders.find(f => f.folderID === currentFolder);
    
    return (
      <TouchableOpacity 
        style={styles.breadcrumb}
        onPress={navigateToRoot}
      >
        <ArrowLeft size={16} color="#9333ea" />
        <Text style={styles.breadcrumbText}>
          {t('notes.backToRoot')} / {folder?.folderName || 'Unknown Folder'}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#1a1a1a', '#2a1a2a']}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>{t('notes.title')}</Text>
        <Text style={styles.headerSubtitle}>{t('notes.subtitle')}</Text>
        
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => {
              setNewNoteTitle('');
              setNewNoteContent('');
              setEditingNote(null);
              setSelectedFolderForNote(currentFolder);
              setShowCreateNoteModal(true);
            }}
          >
            <FileText size={16} color="#9333ea" />
            <Text style={styles.actionButtonText}>{t('notes.newNote')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
              style={styles.actionButton}
              onPress={() => setShowCreateFolderModal(true)}
            >
              <FolderIcon size={16} color="#9333ea" />
              <Text style={styles.actionButtonText}>{t('notes.newFolder')}</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {renderFolderPath()}

      <ScrollView style={styles.content}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#9333ea" />
            <Text style={styles.loadingText}>{t('notes.loading')}</Text>
          </View>
        ) : (
          <>
            {/* Show folders section only at root level */}
            {currentFolder === null && folders.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>{t('notes.foldersTitle')}</Text>
                {folders
                  .filter(folder => folder.folderID !== undefined)
                  .map(folder => (
                    <View key={folder.folderID} style={styles.folderCard}>
                      <TouchableOpacity 
                        style={styles.folderCardContent}
                        onPress={() => navigateToFolder(folder.folderID as string)}
                      >
                        <FolderIcon size={20} color="#9333ea" />
                        <Text style={styles.folderName}>{folder.folderName}</Text>
                        <ChevronRight size={18} color="#9333ea" />
                      </TouchableOpacity>
                      
                      <TouchableOpacity
                        style={styles.deleteButton}
                        onPress={() => handleDeleteFolder(
                          folder.folderID as string, 
                          folder.folderName
                        )}
                        disabled={deletingFolderId === folder.folderID}
                      >
                        {deletingFolderId === folder.folderID ? (
                          <ActivityIndicator size="small" color="#ef4444" />
                        ) : (
                          <Trash2 size={18} color="#ef4444" />
                        )}
                      </TouchableOpacity>
                    </View>
                  ))
                }
              </View>
            )}

            {/* Notes section */}
            {notes.length > 0 ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  {currentFolder === null ? t('notes.notesTitle') : t('notes.notesInFolder')}
                </Text>
        {notes.map(note => (
                  <View key={note.noteID} style={styles.noteCard}>
                    <TouchableOpacity 
                      style={styles.noteCardContent}
                      onPress={() => openViewNoteModal(note)}
                    >
            <View style={styles.noteHeader}>
              <FileText size={20} color="#9333ea" />
              <Text style={styles.noteTitle}>{note.title}</Text>
            </View>

            <View style={styles.noteContentPreview}>
              {renderNotePreview(note.content)}
            </View>

            <View style={styles.noteFooter}>
              <View style={styles.timestampContainer}>
                <Clock size={14} color="#6b7280" />
                <Text style={styles.timestampText}>
                  {formatDate(note.updatedAt)}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
                    
                    <View style={styles.noteActions}>
                      <TouchableOpacity
                        style={styles.editButton}
                        onPress={() => openEditNoteModal(note)}
                      >
                        <Edit size={18} color="#9333ea" />
                      </TouchableOpacity>
                      
                      <TouchableOpacity
                        style={styles.deleteButton}
                        onPress={() => handleDeleteNote(
                          note.noteID as string,
                          note.title
                        )}
                        disabled={deletingNoteId === note.noteID}
                      >
                        {deletingNoteId === note.noteID ? (
                          <ActivityIndicator size="small" color="#ef4444" />
                        ) : (
                          <Trash2 size={18} color="#ef4444" />
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              !isLoading && (
                <View style={styles.emptyState}>
                  <FileText size={48} color="#9333ea" opacity={0.5} />
                  <Text style={styles.emptyStateTitle}>
                    {currentFolder === null ? t('notes.noNotes') : t('notes.noNotesInFolder')}
                  </Text>
                  <Text style={styles.emptyStateText}>
                    {currentFolder === null ? t('notes.createNote') : ''}
                  </Text>
                </View>
              )
            )}
          </>
        )}
      </ScrollView>

      <TouchableOpacity 
        style={styles.addButton}
        onPress={() => {
          setNewNoteTitle('');
          setNewNoteContent('');
          setEditingNote(null);
          setSelectedFolderForNote(currentFolder);
          setShowCreateNoteModal(true);
        }}
      >
        <Plus size={24} color="#ffffff" />
      </TouchableOpacity>

      {renderCreateNoteModal()}
      {renderEditNoteModal()}
      {renderCreateFolderModal()}
      {renderDeleteConfirmationModal()}
      {renderViewNoteModal()}
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
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#999999',
    marginBottom: 16,
  },
  actionButtons: {
    flexDirection: 'row',
    marginTop: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(147, 51, 234, 0.1)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginRight: 8,
  },
  actionButtonText: {
    color: '#9333ea',
    fontWeight: '500',
    fontSize: 14,
    marginLeft: 6,
  },
  breadcrumb: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  breadcrumbText: {
    color: '#4b5563',
    fontWeight: '500',
    fontSize: 14,
    marginLeft: 6,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#4b5563',
    marginBottom: 12,
  },
  folderCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  folderCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  folderName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#4b5563',
    marginLeft: 12,
    flex: 1,
  },
  noteCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  noteCardContent: {
    flex: 1,
  },
  noteActions: {
    justifyContent: 'center',
    gap: 10,
  },
  editButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(147, 51, 234, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  deleteButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  noteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  noteTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginLeft: 12,
    flex: 1,
  },
  noteContent: {
    fontSize: 14,
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
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#4b5563',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    width: '100%',
    maxWidth: 500,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleInput: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#1f2937',
    marginBottom: 12,
  },
  contentInputLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#4b5563',
  },
  contentInput: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#1f2937',
    marginBottom: 16,
    height: 120,
  },
  largeContentInput: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#1f2937',
    marginBottom: 16,
    height: 250, // Increased height for better editing experience
  },
  folderSelector: {
    marginBottom: 16,
  },
  folderSelectorLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#4b5563',
    marginBottom: 8,
  },
  folderOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  folderOption: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  folderOptionSelected: {
    backgroundColor: '#9333ea',
    borderColor: '#9333ea',
  },
  folderOptionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4b5563',
  },
  folderOptionTextSelected: {
    color: '#ffffff',
  },
  saveButton: {
    backgroundColor: '#9333ea',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#d1d5db',
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmModalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    width: '90%',
    maxWidth: 350,
    padding: 20,
  },
  confirmModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 12,
    textAlign: 'center',
  },
  confirmModalText: {
    fontSize: 16,
    color: '#4b5563',
    marginBottom: 20,
    textAlign: 'center',
  },
  confirmModalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  confirmModalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  confirmModalCancelButton: {
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  confirmModalDeleteButton: {
    backgroundColor: '#ef4444',
  },
  confirmModalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4b5563',
  },
  confirmModalDeleteText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  viewNoteContainer: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    marginBottom: 16,
    height: 300,
  },
  viewNoteScrollContainer: {
    padding: 12,
  },
  viewNoteContent: {
    fontSize: 16,
    color: '#1f2937',
    lineHeight: 24,
  },
  viewNoteFooter: {
    marginTop: 8,
  },
  viewNoteTimestamp: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  viewNoteTimestampText: {
    fontSize: 14,
    color: '#6b7280',
    marginLeft: 8,
  },
  viewNoteActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  viewNoteActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    flex: 1,
    marginRight: 8,
  },
  viewNoteDeleteButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    marginRight: 0,
    marginLeft: 8,
  },
  viewNoteActionText: {
    marginLeft: 8,
    fontWeight: '600',
    color: '#9333ea',
  },
  viewNoteDeleteText: {
    marginLeft: 8,
    fontWeight: '600',
    color: '#ef4444',
  },
  checkboxLine: {
    paddingVertical: 4,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkboxText: {
    fontSize: 16,
    color: '#1f2937',
    marginLeft: 8,
    flex: 1,
    lineHeight: 24,
  },
  checkedText: {
    textDecorationLine: 'line-through',
    color: '#9ca3af',
  },
  contentHeaderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  addCheckboxButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  addCheckboxText: {
    color: '#22c55e',
    fontWeight: '500',
    fontSize: 12,
    marginLeft: 4,
  },
  markdownHint: {
    fontSize: 12,
    color: '#6b7280',
    fontStyle: 'italic',
    marginBottom: 16,
    marginTop: -10,
  },
  previewCheckboxLine: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 2,
  },
  previewCheckboxText: {
    fontSize: 14,
    color: '#4b5563',
    marginLeft: 6,
    flex: 1,
  },
  previewCheckedText: {
    textDecorationLine: 'line-through',
    color: '#9ca3af',
  },
  noteContentPreview: {
    marginBottom: 12,
  },
});