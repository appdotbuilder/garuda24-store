import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { tasksTable } from '../db/schema';
import { type ToggleTaskCompletionInput } from '../schema';
import { toggleTaskCompletion } from '../handlers/toggle_task_completion';
import { eq } from 'drizzle-orm';

describe('toggleTaskCompletion', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should toggle task completion from false to true', async () => {
    // Create a task first
    const [createdTask] = await db.insert(tasksTable)
      .values({
        title: 'Test Task',
        description: 'A task for testing',
        completed: false
      })
      .returning()
      .execute();

    const input: ToggleTaskCompletionInput = {
      id: createdTask.id,
      completed: true
    };

    const result = await toggleTaskCompletion(input);

    // Verify the result
    expect(result.id).toEqual(createdTask.id);
    expect(result.title).toEqual('Test Task');
    expect(result.description).toEqual('A task for testing');
    expect(result.completed).toBe(true);
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at > createdTask.updated_at).toBe(true);
  });

  it('should toggle task completion from true to false', async () => {
    // Create a completed task first
    const [createdTask] = await db.insert(tasksTable)
      .values({
        title: 'Completed Task',
        description: null,
        completed: true
      })
      .returning()
      .execute();

    const input: ToggleTaskCompletionInput = {
      id: createdTask.id,
      completed: false
    };

    const result = await toggleTaskCompletion(input);

    // Verify the result
    expect(result.id).toEqual(createdTask.id);
    expect(result.title).toEqual('Completed Task');
    expect(result.description).toBe(null);
    expect(result.completed).toBe(false);
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update the task in the database', async () => {
    // Create a task first
    const [createdTask] = await db.insert(tasksTable)
      .values({
        title: 'Database Test Task',
        description: 'Testing database update',
        completed: false
      })
      .returning()
      .execute();

    const input: ToggleTaskCompletionInput = {
      id: createdTask.id,
      completed: true
    };

    await toggleTaskCompletion(input);

    // Query the database to verify the update
    const [updatedTask] = await db.select()
      .from(tasksTable)
      .where(eq(tasksTable.id, createdTask.id))
      .execute();

    expect(updatedTask).toBeDefined();
    expect(updatedTask.completed).toBe(true);
    expect(updatedTask.updated_at > createdTask.updated_at).toBe(true);
    expect(updatedTask.title).toEqual('Database Test Task');
    expect(updatedTask.description).toEqual('Testing database update');
  });

  it('should throw error when task does not exist', async () => {
    const input: ToggleTaskCompletionInput = {
      id: 99999, // Non-existent task ID
      completed: true
    };

    await expect(toggleTaskCompletion(input)).rejects.toThrow(/Task with id 99999 not found/i);
  });

  it('should handle task with null description', async () => {
    // Create a task with null description
    const [createdTask] = await db.insert(tasksTable)
      .values({
        title: 'Task with null description',
        description: null,
        completed: false
      })
      .returning()
      .execute();

    const input: ToggleTaskCompletionInput = {
      id: createdTask.id,
      completed: true
    };

    const result = await toggleTaskCompletion(input);

    expect(result.description).toBe(null);
    expect(result.completed).toBe(true);
    expect(result.title).toEqual('Task with null description');
  });

  it('should preserve created_at timestamp', async () => {
    // Create a task first
    const [createdTask] = await db.insert(tasksTable)
      .values({
        title: 'Timestamp Test Task',
        description: 'Testing timestamp preservation',
        completed: false
      })
      .returning()
      .execute();

    const originalCreatedAt = createdTask.created_at;

    const input: ToggleTaskCompletionInput = {
      id: createdTask.id,
      completed: true
    };

    const result = await toggleTaskCompletion(input);

    // created_at should remain the same
    expect(result.created_at.getTime()).toEqual(originalCreatedAt.getTime());
    // updated_at should be newer
    expect(result.updated_at.getTime()).toBeGreaterThan(originalCreatedAt.getTime());
  });
});