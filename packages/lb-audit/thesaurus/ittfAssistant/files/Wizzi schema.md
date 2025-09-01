# Wizzi Schema

## Definition

A Wizzi schema describes the semantics of the node hierarchy in an ITTF document. It assigns meaning to the nodes and relationships, effectively defining the "type" of the ITTF document.

## Example

The example provided in the `ITTF format.md` file describes three entities:  
1. **order**  
2. **supplier**  
3. **product**  

Each entity has specific attributes:  

### Attributes of Entities

- **order**  
  - `number`: type `number`  
  - `date`: type `date`  

- **supplier**  
  - `name`: type `string`  
  - `address`: type `string`  
  - `town`: type `string`  
  - `CAP`: type `string`  
  - `country`: type `string`  

- **product**  
  - `code`: type `string`  
  - `description`: type `string`  
  - `quantity`: type `integer`  
  - `price`: type `decimal`  

### Relationships

- A supplier can have many orders (one-to-many).  
- An order can include many products (one-to-many).  

### Schema Representation

The Wizzi schema, written using the ITTF format, describes entities and relationships as follows:

```ittf
e supplier
    a name
        type string
    a address
        type string
    a town
        type string
    a CAP
        type string
    a country
        type string
    r order/s
        one-to-many

e order
    a number
        type number
    a date
        type date
    r product/s
        one-to-many

e product
    a code
        type string 
    a description
        type string
    a quantity
        type integer
    a price
        type decimal
```

---

## Notation

1. **`e`**: Represents an entity.  
2. **`a`**: Represents an attribute.  
3. **`r`**: Represents a relationship.  
4. **`type`**: Specifies the type of the attribute (e.g., `string`, `number`).  
5. Cardinalities:  
   - `one-to-many` (default and can be omitted).  
   - `one-to-one`.

---

## Rules

### 1. Fixed Structure of the Wizzi Schema
- The schema must adhere to the following conventions:
  - Use `e` for entities.
  - Use `a` for attributes.
  - Use `r` for relationships.

### 2. Handling Complex Attributes
- If an attribute cannot be expressed as a scalar value (e.g., `string`, `number`, `date`), it should be converted into its own entity:
  1. Define the new entity with the necessary attributes.
  2. Establish a relationship between the parent entity and the new entity using the `r` node.

### 3. Naming Conventions
- The new entity's name should derive logically from the complex attribute's name for clarity.
- Relationships should reflect the connection between the parent and the new entity (e.g., `r attributeName/s`).

---

## Example: Handling a Complex Attribute

### Before
The entity contains a complex attribute, violating the rules:

```ittf
e parentEntity
    a simpleAttribute
        type string
    a complexAttribute
        type object
```

### After
The complex attribute is promoted to a new entity:

```ittf
e parentEntity
    a simpleAttribute
        type string
    r complexAttribute/1

e complexAttribute
    a subAttribute1
        type string
    a subAttribute2
        type number
```

## Example: Handling a more Complex Data Structure

### Wizzi schema
```ittf
e complexEntity
    a name
        type string
    r items/s
    r nestedArrays/s

e items
    a id
        type string
    a details
        type string
    r subItems/s

e subItems
    a attribute
        type string
    a value
        type decimal

e nestedArrays
    a arrayElement
        type integer
```

### ITTF Document
```ittf
complexEntity
    name "Example Entity"
    items
        id "item1"
        details "Some details"
        subItems
            attribute "Color"
            value 10.5
        subItems
            attribute "Size"
            value 15.2
    items
        id "item2"
        details "Other details"
    nestedArrays
        arrayElement 1
        arrayElement 2
        arrayElement 3
    nestedArrays
        arrayElement 4
        arrayElement 5
        arrayElement 6
```