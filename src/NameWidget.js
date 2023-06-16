import { useState } from "react";

export default function NameWidget({onNameSet}) {
    const [nameInput, setNameInput] = useState("");
    const [isEditing, setIsEditing] = useState(true);

    return <div className="name-entry-widget">
        {isEditing ? <>
            <label>
                <span>
                    Your name:
                </span>
                <input type="text" value={nameInput} onChange={e => setNameInput(e.target.value)}/>
            </label>
                
            <button onClick={() => {onNameSet(nameInput); setIsEditing(false);}}>
            Set name
            </button>
        </>
        : <>
            <span>
                Your name:
                <b>{nameInput}</b>
            </span>
                
            <button onClick={() => {setIsEditing(true);}}>
            Edit
            </button>
        </>}
        
    </div>
}