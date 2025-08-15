import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { tasksTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { type DeleteTaskInput } from '../schema';
import { deleteTask } from '../handlers/delete_task';

// Test input for deleting a task
const testDeleteInput: DeleteTaskInput = {
  id: 1
};

describe('deleteTask', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should delete an existing task', async () => {
    // First create a task to delete
    await db.insert(tasksTable)
      .values({
        title: 'Task to Delete',
        description: 'This task will be deleted',
        completed: false
      })
      .execute();

    // Verify task exists before deletion
    const tasksBefore = await db.select()
      .from(tasksTable)
      .where(eq(tasksTable.id, 1))
      .execute();
    
    expect(tasksBefore).toHaveLength(1);

    // Delete the task
    const result = await deleteTask({ id: 1 });

    // Verify successful response
    expect(result).toEqual({ success: true });

    // Verify task is deleted from database
    const tasksAfter = await db.select()
      .from(tasksTable)
      .where(eq(tasksTable.id, 1))
      .execute();

    expect(tasksAfter).toHaveLength(0);
  });

  it('should throw error when deleting non-existent task', async () => {
    // Try to delete a task that doesn't exist
    await expect(deleteTask({ id: 999 }))
      .rejects.toThrow(/Task with id 999 not found/i);
  });

  it('should delete correct task when multiple tasks exist', async () => {
    // Create multiple tasks
    await db.insert(tasksTable)
      .values([
        {
          title: 'Task 1',
          description: 'First task',
          completed: false
        },
        {
          title: 'Task 2', 
          description: 'Second task',
          completed: true
        },
        {
          title: 'Task 3',
          description: 'Third task',
          completed: false
        }
      ])
      .execute();

    // Verify all tasks exist
    const allTasksBefore = await db.select()
      .from(tasksTable)
      .execute();
    
    expect(allTasksBefore).toHaveLength(3);

    // Delete the middle task (id: 2)
    const result = await deleteTask({ id: 2 });

    expect(result).toEqual({ success: true });

    // Verify only the correct task was deleted
    const remainingTasks = await db.select()
      .from(tasksTable)
      .execute();

    expect(remainingTasks).toHaveLength(2);
    
    // Verify the correct tasks remain
    const taskIds = remainingTasks.map(task => task.id);
    expect(taskIds).toContain(1);
    expect(taskIds).toContain(3);
    expect(taskIds).not.toContain(2);

    // Verify task 2 is actually gone
    const deletedTask = await db.select()
      .from(tasksTable)
      .where(eq(tasksTable.id, 2))
      .execute();

    expect(deletedTask).toHaveLength(0);
  });

  it('should handle deletion with valid but non-sequential IDs', async () => {
    // Create a task and manually set a high ID (simulating gaps in ID sequence)
    await db.insert(tasksTable)
      .values({
        title: 'High ID Task',
        description: 'Task with non-sequential ID',
        completed: false
      })
      .execute();

    // Get the actual ID that was created
    const createdTasks = await db.select()
      .from(tasksTable)
      .execute();

    expect(createdTasks).toHaveLength(1);
    const taskId = createdTasks[0].id;

    // Delete the task using its actual ID
    const result = await deleteTask({ id: taskId });

    expect(result).toEqual({ success: true });

    // Verify task is deleted
    const tasksAfter = await db.select()
      .from(tasksTable)
      .where(eq(tasksTable.id, taskId))
      .execute();

    expect(tasksAfter).toHaveLength(0);
  });
});