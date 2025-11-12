import {
    PrimaryGeneratedColumn,
    CreateDateColumn,
    UpdateDateColumn,
    Column,
} from 'typeorm'; 

export abstract class AuditedEntity {
    @PrimaryGeneratedColumn('uuid') 
    id: string; 

    @CreateDateColumn() 
    createdAt: Date; 

    @UpdateDateColumn() 
    updatedAt: Date; 

    @Column({ nullable: true }) 
    createdBy?: string; 

    @Column({ nullable: true }) 
    updatedBy?: string; 
}