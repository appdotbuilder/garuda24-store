import { db } from '../db';
import { tasksTable } from '../db/schema';
import { type ToggleTaskCompletionInput, type Task } from '../schema';
import { eq } from 'drizzle-orm';

export const toggleTaskCompletion = async (input: ToggleTaskCompletionInput): Promise<Task> => {
  try {
    // Update the task with new completion status and updated timestamp
    const result = await db.update(tasksTable)
      .set({
        completed: input.completed,
        updated_at: new Date()
      })
      .where(eq(tasksTable.id, input.id))
      .returning()
      .execute();

    // Check if task was found and updated
    if (result.length === 0) {
      throw new Error(`Task with id ${input.id} not found`);
    }

    return result[0];
  } catch (error) {
    console.error('Task completion toggle failed:', error);
    throw error;
  }
};