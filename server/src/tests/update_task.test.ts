import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { tasksTable } from '../db/schema';
import { type UpdateTaskInput, type CreateTaskInput } from '../schema';
import { updateTask } from '../handlers/update_task';
import { eq } from 'drizzle-orm';

// Helper function to create a test task
const createTestTask = async (taskData: CreateTaskInput) => {
  const result = await db.insert(tasksTable)
    .values({
      title: taskData.title,
      description: taskData.description || null,
      completed: false
    })
    .returning()
    .execute();
  return result[0];
};

describe('updateTask', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update task title only', async () => {
    // Create a test task
    const testTask = await createTestTask({
      title: 'Original Title',
      description: 'Original description'
    });

    const updateInput: UpdateTaskInput = {
      id: testTask.id,
      title: 'Updated Title'
    };

    const result = await updateTask(updateInput);

    // Verify the updated fields
    expect(result.title).toEqual('Updated Title');
    expect(result.description).toEqual('Original description'); // Unchanged
    expect(result.completed).toEqual(false); // Unchanged
    expect(result.id).toEqual(testTask.id);
    expect(result.created_at).toEqual(testTask.created_at); // Should be preserved
    expect(result.updated_at).not.toEqual(testTask.updated_at); // Should be updated
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update task description only', async () => {
    // Create a test task
    const testTask = await createTestTask({
      title: 'Test Task',
      description: 'Original description'
    });

    const updateInput: UpdateTaskInput = {
      id: testTask.id,
      description: 'Updated description'
    };

    const result = await updateTask(updateInput);

    // Verify the updated fields
    expect(result.title).toEqual('Test Task'); // Unchanged
    expect(result.description).toEqual('Updated description');
    expect(result.completed).toEqual(false); // Unchanged
    expect(result.updated_at).not.toEqual(testTask.updated_at); // Should be updated
  });

  it('should update task completion status only', async () => {
    // Create a test task
    const testTask = await createTestTask({
      title: 'Test Task',
      description: 'Test description'
    });

    const updateInput: UpdateTaskInput = {
      id: testTask.id,
      completed: true
    };

    const result = await updateTask(updateInput);

    // Verify the updated fields
    expect(result.title).toEqual('Test Task'); // Unchanged
    expect(result.description).toEqual('Test description'); // Unchanged
    expect(result.completed).toEqual(true);
    expect(result.updated_at).not.toEqual(testTask.updated_at); // Should be updated
  });

  it('should update multiple fields at once', async () => {
    // Create a test task
    const testTask = await createTestTask({
      title: 'Original Title',
      description: 'Original description'
    });

    const updateInput: UpdateTaskInput = {
      id: testTask.id,
      title: 'New Title',
      description: 'New description',
      completed: true
    };

    const result = await updateTask(updateInput);

    // Verify all fields were updated
    expect(result.title).toEqual('New Title');
    expect(result.description).toEqual('New description');
    expect(result.completed).toEqual(true);
    expect(result.updated_at).not.toEqual(testTask.updated_at); // Should be updated
  });

  it('should update description to null', async () => {
    // Create a test task with a description
    const testTask = await createTestTask({
      title: 'Test Task',
      description: 'Original description'
    });

    const updateInput: UpdateTaskInput = {
      id: testTask.id,
      description: null
    };

    const result = await updateTask(updateInput);

    // Verify description was set to null
    expect(result.title).toEqual('Test Task'); // Unchanged
    expect(result.description).toBeNull();
    expect(result.completed).toEqual(false); // Unchanged
  });

  it('should persist changes to database', async () => {
    // Create a test task
    const testTask = await createTestTask({
      title: 'Original Title',
      description: 'Original description'
    });

    const updateInput: UpdateTaskInput = {
      id: testTask.id,
      title: 'Updated Title',
      completed: true
    };

    await updateTask(updateInput);

    // Query the database directly to verify persistence
    const tasksFromDb = await db.select()
      .from(tasksTable)
      .where(eq(tasksTable.id, testTask.id))
      .execute();

    expect(tasksFromDb).toHaveLength(1);
    const taskFromDb = tasksFromDb[0];
    expect(taskFromDb.title).toEqual('Updated Title');
    expect(taskFromDb.description).toEqual('Original description');
    expect(taskFromDb.completed).toEqual(true);
    expect(taskFromDb.updated_at).toBeInstanceOf(Date);
    expect(taskFromDb.updated_at > testTask.updated_at).toBe(true);
  });

  it('should throw error when task does not exist', async () => {
    const updateInput: UpdateTaskInput = {
      id: 999999, // Non-existent ID
      title: 'Updated Title'
    };

    await expect(updateTask(updateInput)).rejects.toThrow(/task with id 999999 not found/i);
  });

  it('should update only updated_at timestamp when no other fields provided', async () => {
    // Create a test task
    const testTask = await createTestTask({
      title: 'Test Task',
      description: 'Test description'
    });

    // Wait a bit to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10));

    const updateInput: UpdateTaskInput = {
      id: testTask.id
      // No other fields provided
    };

    const result = await updateTask(updateInput);

    // Verify no data fields changed, but timestamp did
    expect(result.title).toEqual('Test Task');
    expect(result.description).toEqual('Test description');
    expect(result.completed).toEqual(false);
    expect(result.created_at).toEqual(testTask.created_at);
    expect(result.updated_at).not.toEqual(testTask.updated_at);
    expect(result.updated_at > testTask.updated_at).toBe(true);
  });
});