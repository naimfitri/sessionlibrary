import {
    CreateDateColumn,
    UpdateDateColumn,
    Column,
} from 'typeorm'; 

/**
 * Base class for entities that need audit tracking.
 * 
 * Automatically tracks:
 * - createdBy: User ID who created the record
 * - updatedBy: User ID who last updated the record
 * - auditCreatedAt: Timestamp when record was created
 * - auditUpdatedAt: Timestamp when record was last updated
 * 
 * Usage:
 * @example
 * @Entity()
 * export class MyEntity extends AuditedEntity {
 *   @PrimaryGeneratedColumn()
 *   id: number;
 *   
 *   @Column()
 *   name: string;
 * }
 * 
 * Note: Due to TypeScript inheritance, audit fields appear before your entity's fields.
 * This is normal and does not affect functionality.
 */
export abstract class AuditedEntity {
    @CreateDateColumn({ name: 'audit_created_at' })
    auditCreatedAt: Date; 

    @UpdateDateColumn({ name: 'audit_updated_at' }) 
    auditUpdatedAt: Date; 

    @Column({ name: 'created_by', type: 'varchar', nullable: true }) 
    createdBy?: string; 

    @Column({ name: 'updated_by', type: 'varchar', nullable: true }) 
    updatedBy?: string; 
}