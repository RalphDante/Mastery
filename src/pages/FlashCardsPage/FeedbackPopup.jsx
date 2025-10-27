import { useEffect, useState } from 'react';
import styles from './FeedbackPopup.module.css';

function FeedbackPopup({ isCorrect, onComplete }) {
    const [isVisible, setIsVisible] = useState(true);

    const rewards = isCorrect ? {
        exp: 15,
        damage: 15,
        hp: 2,
        mana: 5
    } : {
        exp: 5,
        damage: 5,
        hp: 0,
        mana: 2
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsVisible(false);
            if (onComplete) onComplete();
        }, 1500); // Shorter duration

        return () => clearTimeout(timer);
    }, [onComplete]);

    if (!isVisible) return null;

    return (
        <div className={styles.feedbackContainer}>
            <div 
                className={`${styles.feedbackPopup} ${
                    isCorrect 
                        ? styles.correct 
                        : styles.incorrect
                }`}
            >
                <div className={styles.feedbackContent}>
                   
                    <div className={styles.feedbackRewards}>
                        {rewards.exp > 0 && <span>+{rewards.exp} EXP</span>}
                        {rewards.damage > 0 && <span>+{rewards.damage} DMG</span>}
                        {rewards.hp > 0 && <span>+{rewards.hp} HP</span>}
                        {rewards.mana > 0 && <span>+{rewards.mana} MANA</span>}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default FeedbackPopup;