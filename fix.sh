sed -i '1413,1421c\
            const extractedText = await processWithAgents({\
              phone,\
              senderName,\
              text,\
              history: currentDB.messagesHistory[phone] || [],\
              mediaInfo: mediaInfoStr,\
              mediaBase64,\
              mediaMimeType\
            });' server.ts
