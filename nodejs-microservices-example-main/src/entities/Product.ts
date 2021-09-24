import { Entity, Column, ObjectIdColumn } from "typeorm";

@Entity()
export  class Product {

    @ObjectIdColumn()
    id: string

    @Column({unique: true})
    id_admin: number

    @Column()
    title: string;

    @Column()
    image: string;

    @Column( { default: 0 } )
    likes: number;



}