import os
import sys
import json
import torch
import torch.nn as nn

sys.path.insert(0, os.path.abspath('Automatic-Piano-Fingering-main'))
from nns import seq2seq_model, common

os.makedirs('public/models', exist_ok=True)

class EncoderModel(nn.Module):
    def __init__(self, encoder):
        super().__init__()
        self.rnn = encoder.rnn1

    def forward(self, notes):
        # notes: [1, seq_len, 1]
        out, _ = self.rnn(notes)
        return out

class DecoderStepModel(nn.Module):
    def __init__(self, decoder):
        super().__init__()
        self.ar_lstm = decoder.ar_lstm
        self.fc = decoder.FC

    def forward(self, enc_step, prev_emb, h, c):
        # enc_step: [1, 1, 64]
        # prev_emb: [1, 1, 64]
        # h: [1, 1, 64]
        # c: [1, 1, 64]
        inp = torch.cat([enc_step, prev_emb], dim=2)
        lstm_out, (next_h, next_c) = self.ar_lstm(inp, (h, c))
        logits = self.fc(lstm_out)
        return logits.squeeze(1), next_h, next_c

def export_hand(hand_side):
    ckpt_path = f'Automatic-Piano-Fingering-main/models/{hand_side}_ArLSTM.pth'
    print(f"Loading {ckpt_path}...")
    m = seq2seq_model.seq2seq(
        embedding=common.only_pitch(),
        encoder=seq2seq_model.lstm_encoder(input=1, dropout=0.0),
        decoder=seq2seq_model.AR_decoder(64)
    )
    ckpt = torch.load(ckpt_path, map_location='cpu', weights_only=False)
    m.load_state_dict(ckpt['model_state_dict'])
    m.eval()

    # 1. Export Encoder
    enc_model = EncoderModel(m.encoder)
    enc_model.eval()
    dummy_notes = torch.zeros(1, 10, 1, dtype=torch.float32)
    enc_path = f'public/models/{hand_side}_encoder.onnx'
    torch.onnx.export(
        enc_model,
        dummy_notes,
        enc_path,
        input_names=['notes'],
        output_names=['enc_seq'],
        dynamic_axes={'notes': {1: 'seq_len'}, 'enc_seq': {1: 'seq_len'}},
        opset_version=14,
        dynamo=False
    )
    print(f"Exported {enc_path} ({os.path.getsize(enc_path) / 1024:.1f} KB)")

    # 2. Export Decoder Step
    dec_model = DecoderStepModel(m.decoder)
    dec_model.eval()
    dummy_enc_step = torch.zeros(1, 1, 64, dtype=torch.float32)
    dummy_prev_emb = torch.zeros(1, 1, 64, dtype=torch.float32)
    dummy_h = torch.zeros(1, 1, 64, dtype=torch.float32)
    dummy_c = torch.zeros(1, 1, 64, dtype=torch.float32)
    dec_path = f'public/models/{hand_side}_decoder_step.onnx'
    torch.onnx.export(
        dec_model,
        (dummy_enc_step, dummy_prev_emb, dummy_h, dummy_c),
        dec_path,
        input_names=['enc_step', 'prev_emb', 'h', 'c'],
        output_names=['logits', 'next_h', 'next_c'],
        opset_version=14,
        dynamo=False
    )
    print(f"Exported {dec_path} ({os.path.getsize(dec_path) / 1024:.1f} KB)")

    # 3. Return embeddings table
    emb_weights = m.decoder.class_embedding.weight.detach().cpu().numpy().tolist()
    return emb_weights

rh_emb = export_hand('right')
lh_emb = export_hand('left')

with open('public/models/embeddings.json', 'w') as f:
    json.dump({'right': rh_emb, 'left': lh_emb}, f)
print("Exported embeddings.json")
