import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, query, where, getDocs, updateDoc } from 'firebase/firestore';
import { db } from '@/utils/firebase'; // Adjust if path is different
import dayjs from 'dayjs';

const resetWeeklyTasks = async (userId: string) => {
  const today = dayjs();
  const weekday = today.day(); // 1 = Monday
  const currentDate = today.format('YYYY-MM-DD');

  const lastResetDate = await AsyncStorage.getItem('lastResetDate');

  if (weekday === 1 && lastResetDate !== currentDate) {
    console.log('Resetting weekly tasks...');

    try {
      const tasksRef = collection(db, 'users', userId, 'tasks');
      const q = query(tasksRef, where('isWeekly', '==', true));

      const snapshot = await getDocs(q);

      const promises = snapshot.docs.map((doc) =>
        updateDoc(doc.ref, {
          completed: false, // Reset the task
        })
      );

      await Promise.all(promises);
      await AsyncStorage.setItem('lastResetDate', currentDate);
      console.log('Weekly tasks reset done ✅');
    } catch (error) {
      console.error('Error resetting tasks:', error);
    }
  } else {
    console.log('No reset needed today.');
  }
};
export default resetWeeklyTasks;