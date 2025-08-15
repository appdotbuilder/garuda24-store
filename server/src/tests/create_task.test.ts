import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { tasksTable } from '../db/schema';
import { type CreateTaskInput } from '../schema';
import { createTask } from '../handlers/create_task';
import { eq } from 'drizzle-orm';

// Test inputs with all required fields
const testInputWithDescription: CreateTaskInput = {
  title: 'Test Task with Description',
  description: 'A detailed description for testing'
};

const testInputWithoutDescription: CreateTaskInput = {
  title: 'Test Task without Description'
  // description is omitted
};

const testInputWithNullDescription: CreateTaskInput = {
  title: 'Test Task with Null Description',
  description: null
};

describe('createTask', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a task with description', async () => {
    const result = await createTask(testInputWithDescription);

    // Basic field validation
    expect(result.title).toEqual('Test Task with Description');
    expect(result.description).toEqual('A detailed description for testing');
    expect(result.completed).toEqual(false);
    expect(result.id).toBeDefined();
    expect(typeof result.id).toBe('number');
    expect(result.id).toBeGreaterThan(0);
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create a task without description', async () => {
    const result = await createTask(testInputWithoutDescription);

    // Basic field validation
    expect(result.title).toEqual('Test Task without Description');
    expect(result.description).toBeNull();
    expect(result.completed).toEqual(false);
    expect(result.id).toBeDefined();
    expect(typeof result.id).toBe('number');
    expect(result.id).toBeGreaterThan(0);
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create a task with null description', async () => {
    const result = await createTask(testInputWithNullDescription);

    // Basic field validation
    expect(result.title).toEqual('Test Task with Null Description');
    expect(result.description).toBeNull();
    expect(result.completed).toEqual(false);
    expect(result.id).toBeDefined();
    expect(typeof result.id).toBe('number');
    expect(result.id).toBeGreaterThan(0);
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save task to database', async () => {
    const result = await createTask(testInputWithDescription);

    // Query using proper drizzle syntax
    const tasks = await db.select()
      .from(tasksTable)
      .where(eq(tasksTable.id, result.id))
      .execute();

    expect(tasks).toHaveLength(1);
    const savedTask = tasks[0];
    expect(savedTask.title).toEqual('Test Task with Description');
    expect(savedTask.description).toEqual('A detailed description for testing');
    expect(savedTask.completed).toEqual(false);
    expect(savedTask.created_at).toBeInstanceOf(Date);
    expect(savedTask.updated_at).toBeInstanceOf(Date);
  });

  it('should set default completed to false', async () => {
    const result = await createTask(testInputWithDescription);

    expect(result.completed).toEqual(false);

    // Verify in database
    const tasks = await db.select()
      .from(tasksTable)
      .where(eq(tasksTable.id, result.id))
      .execute();

    expect(tasks[0].completed).toEqual(false);
  });

  it('should generate unique IDs for multiple tasks', async () => {
    const task1 = await createTask(testInputWithDescription);
    const task2 = await createTask(testInputWithoutDescription);

    expect(task1.id).not.toEqual(task2.id);
    expect(task1.id).toBeGreaterThan(0);
    expect(task2.id).toBeGreaterThan(0);

    // Verify both tasks exist in database
    const allTasks = await db.select()
      .from(tasksTable)
      .execute();

    expect(allTasks).toHaveLength(2);
    const ids = allTasks.map(task => task.id);
    expect(ids).toContain(task1.id);
    expect(ids).toContain(task2.id);
  });

  it('should set created_at and updated_at timestamps', async () => {
    const beforeCreate = new Date();
    const result = await createTask(testInputWithDescription);
    const afterCreate = new Date();

    // Check that timestamps are within reasonable range
    expect(result.created_at.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime());
    expect(result.created_at.getTime()).toBeLessThanOrEqual(afterCreate.getTime());
    expect(result.updated_at.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime());
    expect(result.updated_at.getTime()).toBeLessThanOrEqual(afterCreate.getTime());

    // Verify timestamps in database
    const tasks = await db.select()
      .from(tasksTable)
      .where(eq(tasksTable.id, result.id))
      .execute();

    const savedTask = tasks[0];
    expect(savedTask.created_at).toBeInstanceOf(Date);
    expect(savedTask.updated_at).toBeInstanceOf(Date);
  });
});