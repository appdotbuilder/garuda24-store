import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { tasksTable } from '../db/schema';
import { type CreateTaskInput } from '../schema';
import { getTasks } from '../handlers/get_tasks';

describe('getTasks', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no tasks exist', async () => {
    const result = await getTasks();
    
    expect(result).toEqual([]);
    expect(result).toHaveLength(0);
  });

  it('should return all tasks', async () => {
    // Create test tasks directly in database
    await db.insert(tasksTable).values([
      {
        title: 'Task 1',
        description: 'First task',
        completed: false
      },
      {
        title: 'Task 2',
        description: null,
        completed: true
      },
      {
        title: 'Task 3',
        description: 'Third task',
        completed: false
      }
    ]).execute();

    const result = await getTasks();

    expect(result).toHaveLength(3);
    
    // Verify all task fields are present
    result.forEach(task => {
      expect(task.id).toBeDefined();
      expect(typeof task.title).toBe('string');
      expect(typeof task.completed).toBe('boolean');
      expect(task.created_at).toBeInstanceOf(Date);
      expect(task.updated_at).toBeInstanceOf(Date);
      // description can be string or null
      expect(task.description === null || typeof task.description === 'string').toBe(true);
    });

    // Check specific task content
    const taskTitles = result.map(task => task.title);
    expect(taskTitles).toContain('Task 1');
    expect(taskTitles).toContain('Task 2');
    expect(taskTitles).toContain('Task 3');
  });

  it('should return tasks ordered by creation date (most recent first)', async () => {
    // Create tasks with slight delays to ensure different timestamps
    const task1 = await db.insert(tasksTable).values({
      title: 'First Task',
      description: 'Created first',
      completed: false
    }).returning().execute();

    // Small delay to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 10));

    const task2 = await db.insert(tasksTable).values({
      title: 'Second Task',
      description: 'Created second',
      completed: false
    }).returning().execute();

    await new Promise(resolve => setTimeout(resolve, 10));

    const task3 = await db.insert(tasksTable).values({
      title: 'Third Task',
      description: 'Created third',
      completed: false
    }).returning().execute();

    const result = await getTasks();

    expect(result).toHaveLength(3);
    
    // Verify ordering - most recent first
    expect(result[0].title).toBe('Third Task');
    expect(result[1].title).toBe('Second Task');
    expect(result[2].title).toBe('First Task');

    // Verify timestamps are in descending order
    expect(result[0].created_at >= result[1].created_at).toBe(true);
    expect(result[1].created_at >= result[2].created_at).toBe(true);
  });

  it('should handle tasks with null descriptions', async () => {
    await db.insert(tasksTable).values([
      {
        title: 'Task with description',
        description: 'This has a description',
        completed: false
      },
      {
        title: 'Task without description',
        description: null,
        completed: true
      }
    ]).execute();

    const result = await getTasks();

    expect(result).toHaveLength(2);
    
    const taskWithDesc = result.find(task => task.title === 'Task with description');
    const taskWithoutDesc = result.find(task => task.title === 'Task without description');

    expect(taskWithDesc?.description).toBe('This has a description');
    expect(taskWithoutDesc?.description).toBe(null);
  });

  it('should handle both completed and incomplete tasks', async () => {
    await db.insert(tasksTable).values([
      {
        title: 'Completed Task',
        description: 'This is done',
        completed: true
      },
      {
        title: 'Incomplete Task',
        description: 'This is not done',
        completed: false
      }
    ]).execute();

    const result = await getTasks();

    expect(result).toHaveLength(2);
    
    const completedTask = result.find(task => task.title === 'Completed Task');
    const incompleteTask = result.find(task => task.title === 'Incomplete Task');

    expect(completedTask?.completed).toBe(true);
    expect(incompleteTask?.completed).toBe(false);
  });
});