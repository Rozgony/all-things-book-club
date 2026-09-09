package crypto

import "encoding/hex"

func GenerateID() (string, error) {
    bytes, err := RandomBytes(12)
    if err != nil {
        return "", err
    }
    return hex.EncodeToString(bytes), nil
}